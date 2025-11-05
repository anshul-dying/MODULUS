import json
import os
import subprocess
from pathlib import Path

from autotrain.commands import launch_command
from autotrain.trainers.image_classification.params import ImageClassificationParams
from autotrain.trainers.image_regression.params import ImageRegressionParams


def run_training(params, task_id, local=False, wait=False):
    params = json.loads(params)
    if isinstance(params, str):
        params = json.loads(params)
    if task_id == 18:
        params = ImageClassificationParams(**params)
    elif task_id == 24:
        params = ImageRegressionParams(**params)
    else:
        raise NotImplementedError

    params.save(output_dir=params.project_name)
    cmd = launch_command(params=params)
    cmd = [str(c) for c in cmd]
    env = os.environ.copy()
    
    # Add src/ directory to PYTHONPATH so autotrain modules can be found
    # When Python runs `-m autotrain.trainers.image_classification`, it looks for
    # an 'autotrain' package in PYTHONPATH directories
    # Path from src/autotrain/utils.py: utils.py -> autotrain/ -> src/
    src_dir = Path(__file__).parent.parent.resolve()
    pythonpath = str(src_dir)
    if "PYTHONPATH" in env:
        env["PYTHONPATH"] = f"{pythonpath}{os.pathsep}{env['PYTHONPATH']}"
    else:
        env["PYTHONPATH"] = pythonpath
    
    process = subprocess.Popen(cmd, env=env)
    if wait:
        process.wait()
    return process.pid
