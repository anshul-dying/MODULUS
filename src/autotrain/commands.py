import os
import shlex

import torch

from autotrain import logger
from autotrain.trainers.image_classification.params import ImageClassificationParams
from autotrain.trainers.image_regression.params import ImageRegressionParams


CPU_COMMAND = ["accelerate", "launch", "--cpu"]
SINGLE_GPU_COMMAND = ["accelerate", "launch", "--num_machines", "1", "--num_processes", "1"]


def get_accelerate_command(num_gpus):
    if num_gpus == 0:
        logger.warning("No GPU found. Forcing training on CPU. This will be slow.")
        return CPU_COMMAND
    if num_gpus == 1:
        return SINGLE_GPU_COMMAND
    return [
        "accelerate",
        "launch",
        "--multi_gpu",
        "--num_machines",
        "1",
        "--num_processes",
        str(num_gpus),
    ]


def launch_command(params):
    params.project_name = shlex.split(params.project_name)[0]
    cuda_available = torch.cuda.is_available()
    mps_available = torch.backends.mps.is_available()
    if cuda_available:
        num_gpus = torch.cuda.device_count()
    elif mps_available:
        num_gpus = 1
    else:
        num_gpus = 0

    if isinstance(params, ImageClassificationParams):
        cmd = get_accelerate_command(num_gpus)
        if num_gpus > 0:
            cmd.append("--mixed_precision")
            if params.mixed_precision == "fp16":
                cmd.append("fp16")
            elif params.mixed_precision == "bf16":
                cmd.append("bf16")
            else:
                cmd.append("no")
        cmd.extend(
            [
                "-m",
                "autotrain.trainers.image_classification",
                "--training_config",
                os.path.join(params.project_name, "training_params.json"),
            ]
        )
    elif isinstance(params, ImageRegressionParams):
        cmd = get_accelerate_command(num_gpus)
        if num_gpus > 0:
            cmd.append("--mixed_precision")
            if params.mixed_precision == "fp16":
                cmd.append("fp16")
            elif params.mixed_precision == "bf16":
                cmd.append("bf16")
            else:
                cmd.append("no")
        cmd.extend(
            [
                "-m",
                "autotrain.trainers.image_regression",
                "--training_config",
                os.path.join(params.project_name, "training_params.json"),
            ]
        )
    else:
        raise ValueError("Unsupported params type")

    logger.info(cmd)
    logger.info(params)
    return cmd
