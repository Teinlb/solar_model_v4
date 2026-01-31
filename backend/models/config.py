# src/models/config.py
from typing import Any, Dict


class Config:
    """
    Immutable configuration container that recursively converts 
    nested dictionaries to object attributes.
    
    Example:
        >>> cfg = Config({"car": {"mass": 1000}, "env": {"gravity": 9.81}})
        >>> cfg.car.mass
        1000
        >>> cfg.car.mass = 2000  # Raises TypeError
    """
    
    def __init__(self, data: Dict[str, Any]):
        """Initialize from dictionary, recursing into nested dicts."""
        for key, value in data.items():
            if isinstance(value, dict):
                value = Config(value)
            object.__setattr__(self, key, value)

    def __setattr__(self, key: str, value: Any) -> None:
        """Prevent modification after initialization (immutable)."""
        if hasattr(self, key):
            raise TypeError(f"Config is immutable. Cannot modify '{key}'.")
        object.__setattr__(self, key, value)

    def __repr__(self) -> str:
        """Pretty string representation for debugging."""
        return f"Config({self.__dict__})"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Config back to nested dictionary."""
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, Config):
                result[key] = value.to_dict()
            else:
                result[key] = value
        return result