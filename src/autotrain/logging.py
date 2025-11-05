import sys
from dataclasses import dataclass

from loguru import logger


IS_ACCELERATE_AVAILABLE = False

try:
    from accelerate.state import PartialState  # type: ignore[import-not-found]

    IS_ACCELERATE_AVAILABLE = True
except ImportError:
    pass


@dataclass
class Logger:
    """
    Configure a Loguru-based logger that matches the upstream AutoTrain behaviour.
    """

    def __post_init__(self):
        self.log_format = (
            "<level>{level: <8}</level> | "
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        )
        self.logger = logger
        self.setup_logger()

    def _should_log(self, record):
        if not IS_ACCELERATE_AVAILABLE:
            return None
        return PartialState().is_main_process

    def setup_logger(self):
        self.logger.remove()
        self.logger.add(
            sys.stdout,
            format=self.log_format,
            filter=lambda _: self._should_log(_) if IS_ACCELERATE_AVAILABLE else None,
        )

    def get_logger(self):
        return self.logger
