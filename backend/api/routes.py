"""API routes for the solar car simulation."""
from flask import Blueprint, jsonify, request
from pathlib import Path
import json
from ..main import run_simulation, run_parameter_sweep

api_bp = Blueprint('api', __name__)


def get_data_dir():
    """Get the default_data directory path."""
    return Path(__file__).parent.parent.parent / "default_data"


@api_bp.route('/simulate', methods=['POST'])
def simulate():
    """
    Run a single simulation with optional config overrides.
    
    Expected JSON body (all optional):
    {
        "car": {"mass": 1200, "battery_capacity": 50},
        "env": {"slope": 0.05, "solar_irradiance": 800},
        "target_speed": 25,
        "duration": 3600
    }
    """
    try:
        overrides = request.get_json() or {}
        result = run_simulation(overrides)
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({"error": f"Invalid parameters: {str(e)}"}), 400
    except FileNotFoundError as e:
        return jsonify({"error": f"Config not found: {str(e)}"}), 404
    except Exception as e:
        return jsonify({"error": f"Simulation failed: {str(e)}"}), 500


@api_bp.route('/sweep', methods=['POST'])
def sweep():
    """
    Run parameter sweep - cartesian product of parameter values.
    
    Expected JSON body:
    {
        "sweep": {
            "car.mass": [1000, 1200, 1500],
            "env.slope": [0, 2, 5]
        },
        "base": {
            "car": {"drag_coeff": 0.25}
        }
    }
    """
    try:
        data = request.get_json() or {}
        sweep_params = data.get("sweep", {})
        base_overrides = data.get("base", {})
        
        if not sweep_params:
            return jsonify({"error": "No sweep parameters provided"}), 400
        
        # Stream results
        results = []
        for result in run_parameter_sweep(sweep_params, base_overrides):
            results.append(result)
        
        return jsonify({
            "status": "success",
            "total_runs": len(results),
            "successful": sum(1 for r in results if r["status"] == "success"),
            "results": results
        })
        
    except ValueError as e:
        return jsonify({"error": f"Invalid sweep config: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Sweep failed: {str(e)}"}), 500


@api_bp.route('/save-presets', methods=['POST'])
def save_presets():
    """Save presets.json with updated data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        presets_path = get_data_dir() / "presets.json"
        with open(presets_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"status": "success", "message": "Presets saved"})
    except Exception as e:
        return jsonify({"error": f"Failed to save presets: {str(e)}"}), 500


@api_bp.route('/save-config', methods=['POST'])
def save_config():
    """Save parameters.json with updated data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        params_path = get_data_dir() / "parameters.json"
        with open(params_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"status": "success", "message": "Parameters saved"})
    except Exception as e:
        return jsonify({"error": f"Failed to save parameters: {str(e)}"}), 500