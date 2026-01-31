"""Command-line interface for the solar car simulation."""
import sys
import argparse
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import run_simulation, run_parameter_sweep


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Solar Car Range Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single simulation with custom speed
  python run_local_sim.py --car.target_speed 80 --env.slope 2.5
  
  # Parameter sweep
  python run_local_sim.py --sweep car.mass 1000,1200,1500 --sweep env.slope 0,2,5
  
  # Load config from JSON
  python run_local_sim.py --config overrides.json
        """
    )
    
    # Single parameter overrides (can use multiple times)
    parser.add_argument(
        "--set", action="append", nargs=2, metavar=("PARAM", "VALUE"),
        help="Set parameter (dotted path). Example: --set car.mass 1200"
    )
    
    # Parameter sweep (can use multiple times)
    parser.add_argument(
        "--sweep", action="append", nargs=2, metavar=("PARAM", "VALUES"),
        help="Sweep parameter with comma-separated values. Example: --sweep car.mass 1000,1200,1500"
    )
    
    # Config file
    parser.add_argument(
        "--config", type=str,
        help="Load config overrides from JSON file"
    )
    
    # Output options
    parser.add_argument(
        "--verbose", action="store_true",
        help="Print detailed results"
    )
    
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON"
    )
    
    return parser.parse_args()


def build_overrides(args) -> dict:
    """Build config overrides dict from arguments."""
    overrides = {}
    
    # Load from JSON file if provided
    if args.config:
        try:
            with open(args.config, 'r') as f:
                overrides.update(json.load(f))
        except FileNotFoundError:
            print(f"Error: Config file not found: {args.config}")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in {args.config}")
            sys.exit(1)
    
    # Apply --set arguments
    if args.set:
        for param, value in args.set:
            try:
                # Try to parse as number
                if '.' in value:
                    value = float(value)
                else:
                    value = int(value)
            except ValueError:
                pass  # Keep as string
            
            # Convert dotted path to nested dict
            parts = param.split(".")
            current = overrides
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = value
    
    return overrides


def print_results(result: dict, verbose: bool = False):
    """Print simulation results in human-readable format."""
    if result["status"] != "success":
        print(f"Error: {result.get('error', 'Unknown error')}")
        return
    
    final = result["final_state"]
    config = result["config"]
    
    print(f"\n{'='*60}")
    print(f"Simulation Results")
    print(f"{'='*60}")
    print(f"Total distance:      {final['distance']/1000:.1f} km")
    print(f"Total time:          {final['time']/3600:.1f} hours")
    print(f"Final energy:        {final['energy']/1e6:.1f} MJ")
    print(f"Average speed:       {final['velocity']:.1f} m/s")
    print(f"Avg power demand:    {final['power_demand']/1000:.2f} kW")
    print(f"Avg power supply:    {final['power_supply']/1000:.2f} kW")
    print(f"{'='*60}\n")
    
    if verbose:
        print("Configuration used:")
        print(json.dumps(config, indent=2))


def main():
    """Main entry point."""
    args = parse_args()
    
    # Check for sweep
    if args.sweep:
        sweep_params = {}
        for param, values_str in args.sweep:
            try:
                values = [float(v) if '.' in v else int(v) for v in values_str.split(",")]
                sweep_params[param] = values
            except ValueError:
                print(f"Error: Invalid values for sweep parameter '{param}': {values_str}")
                sys.exit(1)
        
        base_overrides = build_overrides(args)
        
        print(f"Running parameter sweep with {len(sweep_params)} parameters...")
        results = []
        for i, result in enumerate(run_parameter_sweep(sweep_params, base_overrides), 1):
            results.append(result)
            status = "OK" if result["status"] == "success" else "FAIL"
            print(f"  Run {i}: {status} - Params: {result.get('params', {})}")
        
        if args.json:
            print(json.dumps({"results": results}, indent=2))
        else:
            print(f"\nCompleted {len(results)} simulation runs")
            successful = sum(1 for r in results if r["status"] == "success")
            print(f"Successful: {successful}/{len(results)}")
    
    else:
        # Single simulation
        overrides = build_overrides(args)
        result = run_simulation(overrides)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_results(result, args.verbose)


if __name__ == "__main__":
    main()
