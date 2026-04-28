import logging
import sys
import types

import pytest

import config.logging as config_logging_mod
from config.logging import configure_logging


@pytest.fixture
def isolated_logger(monkeypatch):
    """Patch the logging module and reset _state so each test starts fresh."""
    monkeypatch.setitem(config_logging_mod._state, "configured", False)
    fresh = logging.Logger("_test_root")
    mock_logging = types.SimpleNamespace(
        getLogger=lambda *args: fresh,
        StreamHandler=logging.StreamHandler,
        Formatter=logging.Formatter,
        INFO=logging.INFO,
    )
    monkeypatch.setattr(config_logging_mod, "logging", mock_logging)
    return fresh


def test_adds_stdout_handler(isolated_logger):
    configure_logging("INFO")
    assert len(isolated_logger.handlers) == 1
    assert isinstance(isolated_logger.handlers[0], logging.StreamHandler)
    assert isolated_logger.handlers[0].stream is sys.stdout


def test_idempotent(isolated_logger):
    configure_logging("INFO")
    count = len(isolated_logger.handlers)
    configure_logging("INFO")
    assert len(isolated_logger.handlers) == count


def test_invalid_level_falls_back_to_info(isolated_logger):
    configure_logging("BOGUS")
    assert isolated_logger.level == logging.INFO
