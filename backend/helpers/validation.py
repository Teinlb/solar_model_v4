import json
from pathlib import Path
from typing import Dict, Any


def _load_parameter_schema() -> Dict[str, Any]:
    """Load parameter definitions from JSON file."""
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    schema_path = project_root / "default_data" / "parameters.json"
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _validate_recursive(data: Dict[str, Any], schema: Dict[str, Any], path: str = "") -> None:
    """Recursively validate nested config dictionary against schema."""
    for key, value in data.items():
        current_path = f"{path}.{key}" if path else key
        
        if key not in schema:
            continue  # Skip unknown keys
        
        schema_item = schema[key]
        
        if isinstance(value, dict):
            # Check if this is a parameter with constraints or a nested section
            if 'constraints' in schema_item:
                # This shouldn't be a dict if it has constraints - skip
                continue
            elif isinstance(schema_item, dict):
                # Recurse into nested dicts
                _validate_recursive(value, schema_item, current_path)
        else:
            # Validate leaf value
            if isinstance(schema_item, dict) and 'constraints' in schema_item:
                _validate_value(value, schema_item['constraints'], current_path)


def _validate_value(value: Any, constraints: Dict[str, Any], path: str) -> None:
    """Validate a single value against its constraints."""
    # Type validation
    if constraints.get('type') == 'float':
        if not isinstance(value, (int, float)):
            raise TypeError(
                f"Parameter '{path}': expected number, got {type(value).__name__}"
            )
    
    # Min/Max validation
    min_val = constraints.get('min')
    max_val = constraints.get('max')
    
    if min_val is not None and value < min_val:
        raise ValueError(f"Parameter '{path}': {value} is below minimum ({min_val})")
    
    if max_val is not None and value > max_val:
        raise ValueError(f"Parameter '{path}': {value} exceeds maximum ({max_val})")


def validate_config(overrides: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate config overrides against parameter schema from JSON.
    
    Args:
        overrides: Dictionary with config values to validate (can be partial)
    
    Returns:
        The input dictionary if validation passes
        
    Raises:
        ValueError: If value is out of bounds
        TypeError: If type is incorrect
    """
    schema = _load_parameter_schema()
    _validate_recursive(overrides, schema)
    return overrides