# coding=utf-8
# Copyright 2020-2023 The HuggingFace AutoTrain Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Lint as: python3
# pylint: enable=line-too-long
import os
import sys
from pathlib import Path

_src_dir = Path(__file__).resolve().parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))


os.environ["BITSANDBYTES_NOWELCOME"] = "1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"


import warnings


try:
    import torch._dynamo  # type: ignore[attr-defined]

    torch._dynamo.config.suppress_errors = True  # type: ignore[attr-defined]
except ImportError:
    pass

from .logging import Logger


warnings.filterwarnings("ignore", category=UserWarning, module="tensorflow")
warnings.filterwarnings("ignore", category=UserWarning, module="transformers")
warnings.filterwarnings("ignore", category=UserWarning, module="peft")
warnings.filterwarnings("ignore", category=UserWarning, module="accelerate")
warnings.filterwarnings("ignore", category=UserWarning, module="datasets")
warnings.filterwarnings("ignore", category=FutureWarning, module="accelerate")
warnings.filterwarnings("ignore", category=UserWarning, module="huggingface_hub")

logger = Logger().get_logger()
__version__ = "0.8.37.dev0"


def is_colab():
    try:
        import google.colab  # type: ignore[import-not-found]

        return True
    except ImportError:
        return False


def is_unsloth_available():
    try:
        from unsloth import FastLanguageModel  # type: ignore[import-not-found]

        return True
    except Exception as e:  # pylint: disable=broad-except
        logger.warning("Unsloth not available, continuing without it")
        logger.warning(e)
        return False
