from dataclasses import dataclass
from typing import Optional, Union

from autotrain.trainers.image_classification.params import ImageClassificationParams
from autotrain.trainers.image_regression.params import ImageRegressionParams


AVAILABLE_HARDWARE = {
    "local": "local",
    "local-cli": "local",
    "local-ui": "local",
}


@dataclass
class BaseBackend:
    params: Union[ImageClassificationParams, ImageRegressionParams]
    backend: str

    def __post_init__(self):
        if self.backend not in AVAILABLE_HARDWARE:
            raise ValueError(f"Invalid backend: {self.backend}")

        self.username: Optional[str] = getattr(self.params, "username", None)
        self.task_id = 18 if isinstance(self.params, ImageClassificationParams) else 24
        self.wait = self.backend in {"local", "local-cli"}
        self.env_vars = {
            "HF_TOKEN": getattr(self.params, "token", None),
            "AUTOTRAIN_USERNAME": self.username,
            "PROJECT_NAME": self.params.project_name,
            "TASK_ID": str(self.task_id),
            "PARAMS": self.params.model_dump_json(),
            "DATA_PATH": self.params.data_path,
        }
        if getattr(self.params, "model", None) is not None:
            self.env_vars["MODEL"] = self.params.model
