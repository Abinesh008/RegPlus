import logging
import sys

def setup_logging(log_level: str = "INFO") -> None:
    """Configure logging using Python's standard logging module."""
    # Resolve the level safely
    level = getattr(logging, log_level.upper(), logging.INFO)
    if not isinstance(level, int):
        level = logging.INFO

    # Configure root logger
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ],
        force=True  # Ensure that configuration overrides any defaults
    )
    
    logger = logging.getLogger("regpulse")
    logger.info("Logging configured with level: %s", log_level)
