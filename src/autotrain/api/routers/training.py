"""
Model training API endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from ..schemas import TrainingRequest, TrainingResponse, TrainingResult
import pandas as pd
import os
import uuid
from datetime import datetime
from ...services.training_service import TrainingService

router = APIRouter()
training_service = TrainingService()

# In-memory storage for training jobs (in production, use Redis or database)
training_jobs = {}

@router.post("/start", response_model=TrainingResponse)
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start a new training job (CSV or Parquet)"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{request.dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{request.dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # Check if it's already a parquet file in processed directory
            if request.dataset_name.endswith('.parquet'):
                parquet_path = f"data/processed/{request.dataset_name}"
                if os.path.exists(parquet_path):
                    filepath = parquet_path
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version
                parquet_name = request.dataset_name.replace('.csv', '.parquet')
                parquet_path = f"data/processed/processed_{parquet_name}"
                if os.path.exists(parquet_path):
                    filepath = parquet_path
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
    
    job_id = str(uuid.uuid4())
    
    # Store job info
    training_jobs[job_id] = {
        "status": "running",
        "dataset_name": request.dataset_name,
        "task_type": request.task_type,
        "target_column": request.target_column,
        "algorithm": request.algorithm,
        "created_at": datetime.now().isoformat()
    }
    
    # Start training in background
    background_tasks.add_task(
        run_training,
        job_id,
        request
    )
    
    return TrainingResponse(
        job_id=job_id,
        status="started",
        message="Training job started"
    )

@router.get("/status/{job_id}", response_model=TrainingResult)
async def get_training_status(job_id: str):
    """Get the status of a training job"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = training_jobs[job_id]
    return TrainingResult(
        job_id=job_id,
        status=job["status"],
        accuracy=job.get("accuracy"),
        metrics=job.get("metrics", {}),
        model_path=job.get("model_path"),
        report_path=job.get("report_path"),
        error=job.get("error")
    )

@router.get("/jobs")
async def list_training_jobs():
    """List all training jobs"""
    print(f"Listing training jobs. Total jobs: {len(training_jobs)}")
    jobs = []
    for job_id, job_data in training_jobs.items():
        job_info = {
            "job_id": job_id,
            "status": job_data["status"],
            "dataset_name": job_data["dataset_name"],
            "algorithm": job_data["algorithm"],
            "target_column": job_data["target_column"],
            "task_type": job_data["task_type"],
            "accuracy": job_data.get("accuracy"),
            "error": job_data.get("error"),
            "created_at": job_data["created_at"]
        }
        jobs.append(job_info)
        print(f"Job {job_id}: {job_data['status']} - {job_data['dataset_name']}")
    print(f"Returning {len(jobs)} jobs")
    return {"jobs": jobs}

async def run_training(job_id: str, request: TrainingRequest):
    """Background task to run training"""
    try:
        print(f"Starting training job {job_id} with dataset {request.dataset_name}")
        
        # Resolve dataset location: uploads/, data/, or processed parquet
        filepath = f"data/uploads/{request.dataset_name}"
        if not os.path.exists(filepath):
            alt_path = f"data/{request.dataset_name}"
            if os.path.exists(alt_path):
                filepath = alt_path
            else:
                # Check if it's already a parquet file in processed directory
                if request.dataset_name.endswith('.parquet'):
                    parquet_path = f"data/processed/{request.dataset_name}"
                    if os.path.exists(parquet_path):
                        filepath = parquet_path
                    else:
                        raise Exception(f"Dataset not found: {request.dataset_name}")
                else:
                    # Try to find processed parquet version
                    parquet_name = request.dataset_name.replace('.csv', '.parquet')
                    parquet_path = f"data/processed/processed_{parquet_name}"
                    if os.path.exists(parquet_path):
                        filepath = parquet_path
                    else:
                        raise Exception(f"Dataset not found: {request.dataset_name}")
        
        # Load dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, sep=request.separator)
        
        print(f"Loaded dataset with shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print(f"Target column '{request.target_column}' values: {df[request.target_column].unique()}")
        print(f"Using separator: '{request.separator}'")
        
        # Run training
        result = await training_service.train_model(
            df=df,
            target_column=request.target_column,
            task_type=request.task_type,
            algorithm=request.algorithm,
            test_size=request.test_size,
            random_state=request.random_state,
            exclude_columns=request.exclude_columns,
            ohe_columns=request.ohe_columns,
            scale_columns=request.scale_columns,
            null_handling=request.null_handling,
            null_fill_value=request.null_fill_value
        )
        
        print(f"Training completed successfully for job {job_id}")
        
        # Update job status
        training_jobs[job_id].update({
            "status": "completed",
            "accuracy": result.get("accuracy"),
            "metrics": result.get("metrics", {}),
            "model_path": result.get("model_path"),
            "report_path": result.get("report_path")
        })
        
        print(f"Job {job_id} status updated to completed. Current jobs: {list(training_jobs.keys())}")
        
    except Exception as e:
        print(f"Training failed for job {job_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)
        training_jobs[job_id]["error_details"] = traceback.print_exc()

@router.get("/reports")
async def list_training_reports():
    """List all available training reports"""
    artifacts_dir = "data/artifacts"
    if not os.path.exists(artifacts_dir):
        return {"reports": []}
    
    reports = []
    for filename in os.listdir(artifacts_dir):
        if filename.startswith("training_report_") and filename.endswith(".html"):
            filepath = os.path.join(artifacts_dir, filename)
            stat = os.stat(filepath)
            
            # Extract job info from filename (training_report_YYYYMMDD_HHMMSS.html)
            # Try to find matching job by checking report_path in jobs
            job_info = {}
            for job_id, job_data in training_jobs.items():
                if job_data.get("report_path") == filepath:
                    job_info = {
                        "job_id": job_id,
                        "dataset_name": job_data.get("dataset_name", "Unknown"),
                        "algorithm": job_data.get("algorithm", "Unknown"),
                        "task_type": job_data.get("task_type", "Unknown"),
                        "status": job_data.get("status", "Unknown"),
                        "created_at": job_data.get("created_at", ""),
                        "accuracy": job_data.get("accuracy")
                    }
                    break
            
            reports.append({
                "filename": filename,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "url": f"/api/training/reports/{filename}",
                **job_info
            })
    
    return {"reports": sorted(reports, key=lambda x: x["created"], reverse=True)}

@router.get("/reports/{filename}")
async def get_training_report(filename: str):
    """Get a training report by filename"""
    # Ensure it's a training report
    if not filename.startswith("training_report_") or not filename.endswith(".html"):
        raise HTTPException(status_code=400, detail="Invalid training report filename")
    
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Training report not found")
    
    return FileResponse(
        path=filepath,
        media_type='text/html',
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@router.delete("/reports/{filename}")
async def delete_training_report(filename: str):
    """Delete a training report"""
    # Ensure it's a training report
    if not filename.startswith("training_report_") or not filename.endswith(".html"):
        raise HTTPException(status_code=400, detail="Invalid training report filename")
    
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Training report not found")
    
    try:
        os.remove(filepath)
        return {"message": "Training report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete training report: {str(e)}")
