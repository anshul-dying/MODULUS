"""Common support utilities used by AutoTrain trainers."""

import json
import os
import shutil
import time
import traceback

import requests
from accelerate import PartialState  # type: ignore[import-not-found]
from huggingface_hub import HfApi  # type: ignore[import-not-found]
from pydantic import BaseModel
from transformers import TrainerCallback, TrainerControl, TrainerState, TrainingArguments  # type: ignore[import-not-found]

from autotrain import is_colab, logger


ALLOW_REMOTE_CODE = os.environ.get("ALLOW_REMOTE_CODE", "true").lower() == "true"


def remove_autotrain_data(config):
    os.system(f"rm -rf {config.project_name}/autotrain-data")
    for root, dirs, _ in os.walk(config.project_name, topdown=False):
        for name in dirs:
            if name.startswith("global_step"):
                shutil.rmtree(os.path.join(root, name), ignore_errors=True)


def save_training_params(config):
    if os.path.exists(f"{config.project_name}/training_params.json"):
        training_params = json.load(open(f"{config.project_name}/training_params.json"))
        if "token" in training_params:
            training_params.pop("token")
            json.dump(training_params, open(f"{config.project_name}/training_params.json", "w"), indent=4)


def pause_space(params, is_failure=False):
    if "SPACE_ID" in os.environ:
        logger.info("Pausing space...")
        api = HfApi(token=getattr(params, "token", None))

        if is_failure:
            msg = "Your training run has failed! Please check the logs for more details"
            title = "Your training has failed ❌"
        else:
            msg = "Your training run was successful!"
            title = "Your training has finished successfully ✅"

        if getattr(params, "token", None) and not params.token.startswith("hf_oauth_"):
            try:
                api.create_discussion(
                    repo_id=os.environ["SPACE_ID"],
                    title=title,
                    description=msg,
                    repo_type="space",
                )
            except Exception as e:  # pylint: disable=broad-except
                logger.warning(f"Failed to create discussion: {e}")
        api.pause_space(repo_id=os.environ["SPACE_ID"])


def monitor(func):
    def wrapper(*args, **kwargs):
        config = kwargs.get("config", None)
        if config is None and len(args) > 0:
            config = args[0]
        try:
            return func(*args, **kwargs)
        except Exception as e:  # pylint: disable=broad-except
            error_message = f"""{func.__name__} has failed due to an exception: {traceback.format_exc()}"""
            logger.error(error_message)
            logger.error(str(e))
            if int(os.environ.get("PAUSE_ON_FAILURE", 1)) == 1:
                pause_space(config, is_failure=True)

    return wrapper


class AutoTrainParams(BaseModel):
    class Config:
        protected_namespaces = ()

    def save(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        path = os.path.join(output_dir, "training_params.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=4))

    def __str__(self):
        data = self.model_dump()
        data["token"] = "*****" if data.get("token") else None
        return str(data)

    def __init__(self, **data):  # type: ignore[override]
        super().__init__(**data)

        if len(self.project_name) > 0:
            if not self.project_name.replace("-", "").isalnum():
                raise ValueError("project_name must be alphanumeric but can contain hyphens")

        if len(self.project_name) > 50:
            raise ValueError("project_name cannot be more than 50 characters")

        defaults = set(self.model_fields.keys())
        supplied = set(data.keys())
        not_supplied = defaults - supplied
        if not_supplied and not is_colab:
            logger.warning(f"Parameters not supplied by user and set to default: {', '.join(not_supplied)}")

        unused = supplied - set(self.model_fields)
        if unused:
            logger.warning(f"Parameters supplied but not used: {', '.join(unused)}")


class UploadLogs(TrainerCallback):
    def __init__(self, config):
        self.config = config
        self.api = None
        self.last_upload_time = 0

        if getattr(self.config, "push_to_hub", False):
            if PartialState().process_index == 0:
                self.api = HfApi(token=config.token)
                self.api.create_repo(
                    repo_id=f"{self.config.username}/{self.config.project_name}", repo_type="model", private=True
                )

    def on_step_end(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
        if getattr(self.config, "push_to_hub", False) is False:
            return control

        if not os.path.exists(os.path.join(self.config.project_name, "runs")):
            return control

        if (state.global_step + 1) % self.config.logging_steps == 0 and getattr(self.config, "log", "none") == "tensorboard":  # noqa: E501
            if PartialState().process_index == 0:
                current_time = time.time()
                if current_time - self.last_upload_time >= 600:
                    try:
                        self.api.upload_folder(
                            folder_path=os.path.join(self.config.project_name, "runs"),
                            repo_id=f"{self.config.username}/{self.config.project_name}",
                            path_in_repo="runs",
                        )
                    except Exception as e:  # pylint: disable=broad-except
                        logger.warning(f"Failed to upload logs: {e}")
                        logger.warning("Continuing training...")

                    self.last_upload_time = current_time
        return control


class LossLoggingCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):  # type: ignore[override]
        _ = logs.pop("total_flos", None) if logs else None
        if state.is_local_process_zero:
            logger.info(logs)


class TrainStartCallback(TrainerCallback):
    def on_train_begin(self, args, state, control, **kwargs):  # type: ignore[override]
        logger.info("Starting to train...")
