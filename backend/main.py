"""
Main simulation orchestration module.

Provides a clean interface for:
- Running single simulations
- Executing parameter sweeps
- Both API and CLI entry points
"""

from typing import Dict, Any, List, Iterator
from itertools import product

from .helpers import load_default_parameters, merge_configs
from .core.simulation import Simulation


def run_simulation(config_overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Run a single simulation with optional config overrides.
    
    Args:
        config_overrides: Optional dict with parameter overrides
        
    Returns:
        Dictionary with simulation results and metadata
        
    Raises:
        ValueError: If config validation fails
        FileNotFoundError: If config file not found
    """
    config_overrides = config_overrides or {}
    
    # Load and merge configuration
    defaults = load_default_parameters()
    config = merge_configs(defaults, config_overrides)
    
    # Run simulation
    sim = Simulation(config)
    history = sim.run()
    
    # Return results
    return {
        "status": "success",
        "config": config.to_dict(),
        "history_length": len(history),
        "final_state": {
            "time": history[-1].time if history else 0,
            "distance": history[-1].distance if history else 0,
            "energy": history[-1].energy if history else 0,
            "velocity": history[-1].velocity if history else 0,
            "power_demand": history[-1].last_power_demand if history else 0,
            "power_supply": history[-1].last_power_supply if history else 0,
        },
        "history": [
            {
                "time": s.time,
                "distance": s.distance,
                "velocity": s.velocity,
                "energy": s.energy,
                "power_demand": s.last_power_demand,
                "power_supply": s.last_power_supply,
            }
            for s in history
        ]
    }


def run_parameter_sweep(
    sweep_params: Dict[str, List[Any]],
    base_overrides: Dict[str, Any] = None
) -> Iterator[Dict[str, Any]]:
    """
    Execute parameter sweep - cartesian product of parameter values.
    
    Yields results one by one to allow streaming/monitoring.
    
    Args:
        sweep_params: Dict mapping param paths to lists of values
                     Example: {"car.mass": [1000, 1200, 1500]}
        base_overrides: Optional base config overrides applied to all runs
        
    Yields:
        Result dict for each simulation run with parameter values included
        
    Example:
        >>> sweep = {
        ...     "car.mass": [1000, 1200],
        ...     "env.slope": [0, 2, 5]
        ... }
        >>> for result in run_parameter_sweep(sweep):
        ...     print(f"Mass: {result['params']['car.mass']}")
    """
    base_overrides = base_overrides or {}
    
    # Parse sweep parameters into nested structure
    sweep_specs = _parse_sweep_params(sweep_params)
    param_names = list(sweep_specs.keys())
    param_values = [sweep_specs[name] for name in param_names]
    
    # Generate all combinations
    for combo in product(*param_values):
        params_dict = dict(zip(param_names, combo))
        
        # Convert flat dict to nested
        config_overrides = _unflatten_dict(params_dict)
        config_overrides.update(base_overrides)
        
        # Run simulation
        try:
            result = run_simulation(config_overrides)
            result["params"] = params_dict
            yield result
        except Exception as e:
            # Yield error result instead of stopping sweep
            yield {
                "status": "error",
                "params": params_dict,
                "error": str(e)
            }


def _parse_sweep_params(params: Dict[str, List[Any]]) -> Dict[str, List[Any]]:
    """
    Validate and parse sweep parameters.
    
    Args:
        params: Sweep parameters with dotted keys (e.g., "car.mass")
        
    Returns:
        Validated sweep spec
        
    Raises:
        ValueError: If parameters are invalid
    """
    if not params:
        raise ValueError("Sweep parameters cannot be empty")
    
    for key, values in params.items():
        if not isinstance(values, (list, tuple)):
            raise ValueError(f"Parameter '{key}': expected list of values, got {type(values).__name__}")
        if len(values) == 0:
            raise ValueError(f"Parameter '{key}': value list cannot be empty")
    
    return params


def _unflatten_dict(flat: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert flat dotted keys to nested dict.
    
    Example:
        >>> _unflatten_dict({"car.mass": 1000, "env.slope": 5})
        {"car": {"mass": 1000}, "env": {"slope": 5}}
    """
    nested = {}
    for key, value in flat.items():
        parts = key.split(".")
        current = nested
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return nested
