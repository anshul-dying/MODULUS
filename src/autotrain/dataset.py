import io
import os
import uuid
import zipfile
from dataclasses import dataclass
from typing import Optional

from autotrain.preprocessor.vision import ImageClassificationPreprocessor, ImageRegressionPreprocessor


def remove_non_image_files(folder):
    allowed_extensions = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ".jsonl"}
    for root, dirs, files in os.walk(folder):
        for file in files:
            file_extension = os.path.splitext(file)[1]
            if file_extension.lower() not in allowed_extensions:
                file_path = os.path.join(root, file)
                os.remove(file_path)
        for subfolder in dirs:
            remove_non_image_files(os.path.join(root, subfolder))


@dataclass
class AutoTrainImageClassificationDataset:
    train_data: str
    token: Optional[str]
    project_name: str
    username: Optional[str]
    valid_data: Optional[str] = None
    percent_valid: Optional[float] = None
    local: bool = False

    def __post_init__(self):
        self.task = "image_multi_class_classification"
        if not self.valid_data and self.percent_valid is None:
            self.percent_valid = 0.2
        elif self.valid_data and self.percent_valid is not None:
            raise ValueError("You can only specify one of valid_data or percent_valid")
        elif self.valid_data:
            self.percent_valid = 0.0

    def prepare(self):
        valid_dir = None
        if not isinstance(self.train_data, str):
            cache_dir = os.environ.get("HF_HOME")
            if not cache_dir:
                cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "huggingface")

            random_uuid = uuid.uuid4()
            train_dir = os.path.join(cache_dir, "autotrain", str(random_uuid))
            os.makedirs(train_dir, exist_ok=True)
            self.train_data.seek(0)
            content = self.train_data.read()
            bytes_io = io.BytesIO(content)

            zip_ref = zipfile.ZipFile(bytes_io, "r")
            zip_ref.extractall(train_dir)
            macosx_dir = os.path.join(train_dir, "__MACOSX")
            if os.path.exists(macosx_dir):
                os.system(f"rm -rf {macosx_dir}")
            remove_non_image_files(train_dir)
            if self.valid_data:
                random_uuid = uuid.uuid4()
                valid_dir = os.path.join(cache_dir, "autotrain", str(random_uuid))
                os.makedirs(valid_dir, exist_ok=True)
                self.valid_data.seek(0)
                content = self.valid_data.read()
                bytes_io = io.BytesIO(content)
                zip_ref = zipfile.ZipFile(bytes_io, "r")
                zip_ref.extractall(valid_dir)
                macosx_dir = os.path.join(valid_dir, "__MACOSX")
                if os.path.exists(macosx_dir):
                    os.system(f"rm -rf {macosx_dir}")
                remove_non_image_files(valid_dir)
        else:
            train_dir = self.train_data
            if self.valid_data:
                valid_dir = self.valid_data

        preprocessor = ImageClassificationPreprocessor(
            train_data=train_dir,
            valid_data=valid_dir,
            token=self.token,
            project_name=self.project_name,
            username=self.username,
            local=self.local,
            test_size=self.percent_valid,
        )
        return preprocessor.prepare()


@dataclass
class AutoTrainImageRegressionDataset:
    train_data: str
    token: Optional[str]
    project_name: str
    username: Optional[str]
    valid_data: Optional[str] = None
    percent_valid: Optional[float] = None
    local: bool = False

    def __post_init__(self):
        self.task = "image_single_column_regression"
        if not self.valid_data and self.percent_valid is None:
            self.percent_valid = 0.2
        elif self.valid_data and self.percent_valid is not None:
            raise ValueError("You can only specify one of valid_data or percent_valid")
        elif self.valid_data:
            self.percent_valid = 0.0

    def prepare(self):
        valid_dir = None
        if not isinstance(self.train_data, str):
            cache_dir = os.environ.get("HF_HOME")
            if not cache_dir:
                cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "huggingface")

            random_uuid = uuid.uuid4()
            train_dir = os.path.join(cache_dir, "autotrain", str(random_uuid))
            os.makedirs(train_dir, exist_ok=True)
            self.train_data.seek(0)
            content = self.train_data.read()
            bytes_io = io.BytesIO(content)

            zip_ref = zipfile.ZipFile(bytes_io, "r")
            zip_ref.extractall(train_dir)
            macosx_dir = os.path.join(train_dir, "__MACOSX")
            if os.path.exists(macosx_dir):
                os.system(f"rm -rf {macosx_dir}")
            remove_non_image_files(train_dir)
            if self.valid_data:
                random_uuid = uuid.uuid4()
                valid_dir = os.path.join(cache_dir, "autotrain", str(random_uuid))
                os.makedirs(valid_dir, exist_ok=True)
                self.valid_data.seek(0)
                content = self.valid_data.read()
                bytes_io = io.BytesIO(content)
                zip_ref = zipfile.ZipFile(bytes_io, "r")
                zip_ref.extractall(valid_dir)
                macosx_dir = os.path.join(valid_dir, "__MACOSX")
                if os.path.exists(macosx_dir):
                    os.system(f"rm -rf {macosx_dir}")
                remove_non_image_files(valid_dir)
        else:
            train_dir = self.train_data
            if self.valid_data:
                valid_dir = self.valid_data

        preprocessor = ImageRegressionPreprocessor(
            train_data=train_dir,
            valid_data=valid_dir,
            token=self.token,
            project_name=self.project_name,
            username=self.username,
            local=self.local,
            test_size=self.percent_valid,
        )
        return preprocessor.prepare()
