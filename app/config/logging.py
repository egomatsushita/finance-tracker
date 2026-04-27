import logging
import sys


def configure_logging(log_level: str = "INFO") -> None:
    """
    Configure the root logger for the application.

    Args:
        log_level: the desired log level name (e.g. "INFO", "DEBUG"). Falls back
                   to INFO if the value is not a recognised logging level.
    """
    logger = logging.getLogger()
    if any(
        isinstance(h, logging.StreamHandler)
        and getattr(h, "stream", None) is sys.stdout
        for h in logger.handlers
    ):
        return

    level = getattr(logging, log_level.strip().upper(), None)
    if not isinstance(level, int):
        level = logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logger.setLevel(level)
    logger.addHandler(handler)
