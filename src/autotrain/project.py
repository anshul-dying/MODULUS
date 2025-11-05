import os
from dataclasses import dataclass
from typing import Union

from autotrain.backends.base import AVAILABLE_HARDWARE
from autotrain.backends.local import LocalRunner
from autotrain.dataset import AutoTrainImageClassificationDataset, AutoTrainImageRegressionDataset
from autotrain.trainers.image_classification.params import ImageClassificationParams
from autotrain.trainers.image_regression.params import ImageRegressionParams


def img_clf_munge_data(params, local):
    train_data_path = os.path.join(params.data_path, params.train_split)
    if params.valid_split is not None:
        valid_data_path = os.path.join(params.data_path, params.valid_split)
    else:
        valid_data_path = None
    if os.path.isdir(train_data_path):
        dset = AutoTrainImageClassificationDataset(
            train_data=train_data_path,
            valid_data=valid_data_path,
            token=params.token,
            project_name=params.project_name,
            username=params.username,
            local=local,
        )
        params.data_path = dset.prepare()
        params.valid_split = "validation"
        params.image_column = "autotrain_image"
        params.target_column = "autotrain_label"
    return params


def img_reg_munge_data(params, local):
    train_data_path = os.path.join(params.data_path, params.train_split)
    if params.valid_split is not None:
        valid_data_path = os.path.join(params.data_path, params.valid_split)
    else:
        valid_data_path = None
    if os.path.isdir(train_data_path):
        dset = AutoTrainImageRegressionDataset(
            train_data=train_data_path,
            valid_data=valid_data_path,
            token=params.token,
            project_name=params.project_name,
            username=params.username,
            local=local,
        )
        params.data_path = dset.prepare()
        params.valid_split = "validation"
        params.image_column = "autotrain_image"
        params.target_column = "autotrain_label"
    return params


@dataclass
class AutoTrainProject:
    params: Union[ImageClassificationParams, ImageRegressionParams]
    backend: str
    process: bool = False

    def __post_init__(self):
        self.local = self.backend.startswith("local")
        if self.backend not in AVAILABLE_HARDWARE:
            raise ValueError(f"Invalid backend: {self.backend}")

    def _process_params_data(self):
        if isinstance(self.params, ImageClassificationParams):
            return img_clf_munge_data(self.params, self.local)
        elif isinstance(self.params, ImageRegressionParams):
            return img_reg_munge_data(self.params, self.local)
        else:
            raise Exception("Invalid params class for image project")

    def create(self):
        if self.process:
            self.params = self._process_params_data()

        runner = LocalRunner(params=self.params, backend=self.backend)
        return runner.create()
