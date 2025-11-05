from __future__ import annotations

import io
import json
import re
import shutil
import threading
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from ...trainers.image_classification.params import ImageClassificationParams
from ...trainers.image_regression.params import ImageRegressionParams
from ...utils import run_training

router = APIRouter()

DATASET_ROOT = Path("data/uploads/image_autotrain")
DATASET_ROOT.mkdir(parents=True, exist_ok=True)

ARTIFACT_ROOT = Path("data/artifacts/image_autotrain")
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DATASET_META_FILENAME = ".metadata.json"

CLASSIFICATION_MODELS = [
    {"id": "google/vit-base-patch16-224", "label": "ViT Base Patch16 224"},
    {"id": "facebook/convnext-tiny-224", "label": "ConvNeXt Tiny 224"},
    {"id": "microsoft/swin-tiny-patch4-window7-224", "label": "Swin Tiny 224"},
    {"id": "microsoft/resnet-50", "label": "ResNet-50"},
]

REGRESSION_MODELS = [
    {"id": "google/vit-base-patch16-224", "label": "ViT Base Patch16 224"},
    {"id": "microsoft/resnet-50", "label": "ResNet-50"},
    {"id": "microsoft/beit-base-patch16-224", "label": "BEiT Base Patch16 224"},
]


class TrainingRequest(BaseModel):
    dataset_name: str = Field(..., description="Uploaded dataset identifier")
    project_name: str = Field(..., min_length=1, max_length=64)
    task_type: str = Field(..., pattern="^(classification|regression)$")
    base_model: str = Field(..., description="HF model id to fine-tune")
    epochs: int = Field(3, ge=1, le=20)
    batch_size: int = Field(8, ge=1, le=64)
    learning_rate: float = Field(5e-5, gt=0)
    gradient_accumulation: int = Field(1, ge=1, le=128)
    warmup_ratio: float = Field(0.1, ge=0, le=1)
    mixed_precision: Optional[str] = Field(None, pattern="^(fp16|bf16)$")
    auto_find_batch_size: bool = False
    push_to_hub: bool = False
    username: Optional[str] = None
    token: Optional[str] = None
    log: str = Field("none", pattern="^(none|tensorboard|wandb)$")
    save_total_limit: int = Field(1, ge=1, le=10)
    seed: int = Field(42, ge=0)


image_training_jobs: Dict[str, Dict] = {}
jobs_lock = threading.Lock()


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\-]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")
    return value or "dataset"


def remove_macos_artifacts(path: Path) -> None:
    for mac_dir in path.glob("**/__MACOSX"):
        if mac_dir.is_dir():
            shutil.rmtree(mac_dir, ignore_errors=True)


def locate_dataset_root(path: Path) -> Path:
    entries = [p for p in path.iterdir() if not p.name.startswith("__MACOSX")]
    if len(entries) == 1 and entries[0].is_dir():
        return locate_dataset_root(entries[0])
    return path


def ensure_train_directory(base_path: Path) -> Path:
    train_dir = base_path / "train"
    if train_dir.exists():
        return base_path

    subdirs = [p for p in base_path.iterdir() if p.is_dir()]
    if not subdirs:
        raise HTTPException(status_code=400, detail="Dataset must contain class folders or a train directory")

    train_dir.mkdir()
    for subdir in subdirs:
        if subdir == train_dir:
            continue
        target = train_dir / subdir.name
        if target.exists():
            continue
        subdir.rename(target)
    return base_path


def summarise_classification_dataset(base_path: Path) -> Dict:
    classes_root = base_path / "train"
    has_validation = (base_path / "validation").exists()
    class_dirs = [d for d in classes_root.iterdir() if d.is_dir()]
    classes = sorted(d.name for d in class_dirs)
    image_count = 0
    for d in class_dirs:
        image_count += sum(1 for f in d.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS)
    return {
        "classes": classes,
        "num_images": image_count,
        "has_validation": has_validation,
    }


def summarise_regression_dataset(base_path: Path) -> Dict:
    has_validation = (base_path / "validation").exists()
    metadata_paths = []
    for split in ("train", "validation"):
        candidate = base_path / split / "metadata.jsonl"
        if candidate.exists():
            metadata_paths.append(candidate)
    if not metadata_paths:
        candidate = base_path / "metadata.jsonl"
        if candidate.exists():
            metadata_paths.append(candidate)
    if not metadata_paths:
        raise HTTPException(status_code=400, detail="metadata.jsonl not found in dataset")

    total_records = 0
    sample_targets: List[Optional[float]] = []
    for meta_path in metadata_paths:
        with meta_path.open("r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                total_records += 1
                if idx < 5:
                    try:
                        entry = json.loads(line)
                        sample_targets.append(entry.get("target"))
                    except json.JSONDecodeError:
                        continue
    return {
        "num_records": total_records,
        "has_validation": has_validation,
        "sample_targets": sample_targets[:5],
    }


def save_dataset_metadata(dataset_dir: Path, metadata: Dict) -> None:
    with open(dataset_dir / DATASET_META_FILENAME, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)


def load_dataset_metadata(dataset_name: str) -> Dict:
    dataset_dir = DATASET_ROOT / dataset_name
    meta_path = dataset_dir / DATASET_META_FILENAME
    if not dataset_dir.exists() or not meta_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
    with meta_path.open("r", encoding="utf-8") as f:
        metadata = json.load(f)
    metadata["path"] = str(dataset_dir.resolve())
    return metadata


def list_all_datasets() -> List[Dict]:
    datasets = []
    for meta_path in DATASET_ROOT.glob(f"*/{DATASET_META_FILENAME}"):
        with meta_path.open("r", encoding="utf-8") as f:
            meta = json.load(f)
        meta["path"] = str(meta_path.parent.resolve())
        datasets.append(meta)
    datasets.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return datasets


def parse_trainer_metrics(project_dir: Path) -> Dict:
    metrics_path = project_dir / "trainer_state.json"
    if not metrics_path.exists():
        return {}
    try:
        with metrics_path.open("r", encoding="utf-8") as f:
            state = json.load(f)
        log_history = state.get("log_history", [])
        eval_logs = [log for log in log_history if any(k.startswith("eval_") for k in log.keys())]
        if not eval_logs:
            return {}
        latest = eval_logs[-1]
        return {k: v for k, v in latest.items() if k.startswith("eval_") or k in {"epoch"}}
    except Exception:  # noqa: B902
        return {}


def training_worker(job_id: str, request: TrainingRequest):
    try:
        with jobs_lock:
            job = image_training_jobs.get(job_id)
            if job:
                job["status"] = "running"
                job["started_at"] = datetime.utcnow().isoformat()

        dataset_meta = load_dataset_metadata(request.dataset_name)
        dataset_path = Path(dataset_meta["path"])

        project_dir = Path(request.project_name)
        if project_dir.exists():
            raise RuntimeError(
                f"Output directory '{project_dir}' already exists. Choose a different project name or remove the directory."
            )

        params_kwargs = dict(
            project_name=request.project_name,
            data_path=str(dataset_path),
            model=request.base_model,
            epochs=request.epochs,
            batch_size=request.batch_size,
            lr=request.learning_rate,
            gradient_accumulation=request.gradient_accumulation,
            warmup_ratio=request.warmup_ratio,
            mixed_precision=request.mixed_precision,
            auto_find_batch_size=request.auto_find_batch_size,
            push_to_hub=request.push_to_hub,
            username=request.username,
            token=request.token,
            log=request.log,
            save_total_limit=request.save_total_limit,
            seed=request.seed,
        )

        if dataset_meta.get("has_validation", False):
            params_kwargs["valid_split"] = "validation"
        else:
            params_kwargs["valid_split"] = None

        if request.task_type == "classification":
            params_class = ImageClassificationParams
            task_id = 18
        else:
            params_class = ImageRegressionParams
            task_id = 24

        params = params_class(**params_kwargs)

        run_training(params.model_dump_json(indent=0), task_id=task_id, local=True, wait=True)

        dest_dir = ARTIFACT_ROOT / request.project_name
        if dest_dir.exists():
            shutil.rmtree(dest_dir, ignore_errors=True)
        if project_dir.exists():
            dest_dir.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(project_dir), dest_dir)
        metrics = parse_trainer_metrics(dest_dir)

        with jobs_lock:
            job = image_training_jobs.get(job_id)
            if job:
                job["status"] = "completed"
                job["finished_at"] = datetime.utcnow().isoformat()
                job["metrics"] = metrics
                job["output_dir"] = str(dest_dir)
    except Exception as e:  # noqa: B902
        with jobs_lock:
            job = image_training_jobs.get(job_id)
            if job:
                job["status"] = "failed"
                job["finished_at"] = datetime.utcnow().isoformat()
                job["error"] = str(e)
    finally:
        with jobs_lock:
            job = image_training_jobs.get(job_id)
            if job:
                job["updated_at"] = datetime.utcnow().isoformat()


@router.post("/upload-dataset")
async def upload_image_dataset(
    file: UploadFile = File(...),
    task_type: str = File(...),
):
    if task_type not in {"classification", "regression"}:
        raise HTTPException(status_code=400, detail="task_type must be 'classification' or 'regression'")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported")

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    slug = slugify(Path(file.filename).stem)
    dataset_name = f"{slug}-{uuid4().hex[:6]}"
    dataset_dir = DATASET_ROOT / dataset_name
    dataset_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
            archive.extractall(dataset_dir)

        remove_macos_artifacts(dataset_dir)

        extracted_root = locate_dataset_root(dataset_dir)
        if extracted_root != dataset_dir:
            for item in extracted_root.iterdir():
                target = dataset_dir / item.name
                if target.exists():
                    continue
                item.rename(target)
            shutil.rmtree(extracted_root, ignore_errors=True)
            extracted_root = dataset_dir

        if task_type == "classification":
            ensure_train_directory(dataset_dir)
            summary = summarise_classification_dataset(dataset_dir)
        else:
            summary = summarise_regression_dataset(dataset_dir)

        metadata = {
            "name": dataset_name,
            "task_type": task_type,
            "created_at": datetime.utcnow().isoformat(),
            "path": str(dataset_dir.resolve()),
            **summary,
        }
        save_dataset_metadata(dataset_dir, metadata)
        metadata.pop("path", None)
        return {"message": "Dataset uploaded successfully", "dataset": metadata}
    except HTTPException:
        raise
    except zipfile.BadZipFile as e:
        if dataset_dir.exists():
            shutil.rmtree(dataset_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Invalid ZIP archive: {e}")
    except Exception as e:  # noqa: B902
        if dataset_dir.exists():
            shutil.rmtree(dataset_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {e}")


@router.get("/datasets")
async def list_image_datasets():
    datasets = list_all_datasets()
    for item in datasets:
        item.pop("path", None)
    return {"datasets": datasets}


@router.get("/models")
async def get_available_models():
    return {
        "classification": CLASSIFICATION_MODELS,
        "regression": REGRESSION_MODELS,
    }


@router.post("/start-training")
async def start_image_training(request: TrainingRequest):
    dataset_meta = load_dataset_metadata(request.dataset_name)

    if request.task_type != dataset_meta.get("task_type"):
        raise HTTPException(status_code=400, detail="Task type does not match the uploaded dataset")

    if request.push_to_hub and (not request.username or not request.token):
        raise HTTPException(status_code=400, detail="username and token are required when push_to_hub is true")

    job_id = f"img_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:6]}"
    job_record = {
        "job_id": job_id,
        "created_at": datetime.utcnow().isoformat(),
        "status": "queued",
        "task_type": request.task_type,
        "dataset_name": request.dataset_name,
        "project_name": request.project_name,
        "base_model": request.base_model,
        "params": request.model_dump(exclude_none=True),
    }
    with jobs_lock:
        image_training_jobs[job_id] = job_record

    worker = threading.Thread(target=training_worker, args=(job_id, request), daemon=True)
    worker.start()

    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs")
async def list_image_training_jobs():
    with jobs_lock:
        jobs = list(image_training_jobs.values())
    jobs.sort(key=lambda job: job.get("created_at", ""), reverse=True)
    return {"jobs": jobs}


@router.get("/jobs/{job_id}")
async def get_image_training_job(job_id: str):
    with jobs_lock:
        job = image_training_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
