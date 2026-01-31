# backend/helpers/config_manager.py
from typing import Any, Dict
from ..models.config import Config
from .validation import validate_config


def merge_dicts(defaults: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively merge override values into defaults dictionary.
    
    Args:
        defaults: Base configuration dictionary (lowest priority)
        overrides: User-provided overrides (highest priority)
    
    Returns:
        Merged dictionary where overrides take precedence over defaults
    
    Example:
        >>> defaults = {"car": {"mass": 1000, "battery": 50}, "env": {"gravity": 9.81}}
        >>> overrides = {"car": {"mass": 1200}}
        >>> result = merge_dicts(defaults, overrides)
        >>> result["car"]["mass"]
        1200
        >>> result["car"]["battery"]
        50
        >>> result["env"]["gravity"]
        9.81
    """
    result = defaults.copy()
    
    for key, override_value in overrides.items():
        default_value = result.get(key)
        
        # Recursive merge for nested dicts
        if isinstance(default_value, dict) and isinstance(override_value, dict):
            result[key] = merge_dicts(default_value, override_value)
        else:
            # Override takes precedence
            result[key] = override_value
    
    return result


def merge_configs(defaults: Config, overrides: Dict[str, Any]) -> Config:
    """
    Merge and validate user overrides into default configuration.
    
    Args:
        defaults: Default Config object loaded from JSON
        overrides: Dictionary of user-provided values to override (will be validated)
    
    Returns:
        New Config object with merged and validated values
    
    Raises:
        ValueError: If override values are out of bounds
        TypeError: If override values have wrong type
        
    Example:
        >>> defaults = Config({"speed": 10, "duration": 100})
        >>> overrides = {"speed": 15}
        >>> merged = merge_configs(defaults, overrides)
        >>> merged.speed
        15
        >>> merged.duration
        100
    """
    # Validate overrides first
    validate_config(overrides)
    
    # Merge and return new Config
    defaults_dict = defaults.to_dict()
    merged_dict = merge_dicts(defaults_dict, overrides)
    return Config(merged_dict)
