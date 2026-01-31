# src/loader.py
import json
from pathlib import Path
from typing import Dict, Any
from ..models.config import Config


def extract_defaults(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively extract 'default' values from nested parameter structure.
    
    Leaf nodes (with 'default' key) return their default value.
    Parent nodes (without 'default') recurse into children.
    """
    result = {}
    for key, value in data.items():
        if isinstance(value, dict):
            if "default" in value:
                result[key] = value["default"]
            else:
                result[key] = extract_defaults(value)
        else:
            result[key] = value
    return result


def get_default_parameters_path() -> Path:
    """Resolve config file path relative to project root."""
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    return project_root / "default_data" / "parameters.json"


def load_default_parameters(config_path: str | None = None) -> Config:
    """
    Load and parse configuration from JSON file.
    
    Args:
        config_path: Optional path to config file. Defaults to project default_data/.
    
    Returns:
        Config object with nested structure matching JSON hierarchy.
    
    Raises:
        FileNotFoundError: If config file not found.
        json.JSONDecodeError: If JSON is invalid.
    """
    if config_path is None:
        config_path = get_default_parameters_path()
    
    config_file = Path(config_path)
    if not config_file.exists():
        raise FileNotFoundError(f"Config file not found: {config_file.absolute()}")
    
    with open(config_file, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    clean_data = extract_defaults(raw_data)
    return Config(clean_data)

#TODO: Update changes to default before saving Class from either terminal or GUI