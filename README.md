# Solar Vehicle Simulator

A physics-based simulation platform for modeling solar-powered vehicle performance with a modern web interface and REST API.

## Architecture Overview

```
┌─────────────────────┐
│   Frontend (React)  │
│  Tailwind CSS       │
│  Vite              │
└──────────┬──────────┘
           │ HTTP POST
           ▼
┌─────────────────────────────────────────┐
│  Backend (Python Flask)                 │
│  ├─ /api/simulate    (single sim)       │
│  └─ /api/sweep       (parameter sweep)  │
│                                         │
│  orchestration (main.py)                │
│  ├─ run_simulation()                    │
│  └─ run_parameter_sweep()               │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Simulation Engine (Python)             │
│  ├─ Physics calculations                │
│  ├─ State management                    │
│  └─ Config validation                   │
└─────────────────────────────────────────┘
```

## Project Structure

```
solar_model/
├── frontend/                    # React web UI
│   ├── src/
│   │   ├── App.jsx             # Main app component (minimal state)
│   │   ├── main.jsx            # Entry point
│   │   ├── index.css           # Tailwind styles
│   │   ├── components/
│   │   │   ├── SimulationForm.jsx    # Input form
│   │   │   └── ResultsPanel.jsx      # Results display
│   │   └── utils/
│   │       └── api.js          # API client (runSimulation, runParameterSweep)
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Python Flask API
│   ├── api/
│   │   ├── __init__.py         # Flask app creation (create_app())
│   │   └── routes.py           # /api/simulate, /api/sweep
│   ├── core/
│   │   ├── simulation.py       # Simulation engine
│   │   ├── physics.py          # Physics calculations
│   │   └── loader.py
│   ├── models/
│   │   ├── config.py           # Immutable Config class
│   │   └── state.py            # SimState dataclass
│   ├── helpers/
│   │   ├── default_loader.py   # load_default_parameters()
│   │   ├── validation.py       # validate_config()
│   │   └── config_manager.py   # merge_configs()
│   └── main.py                 # Orchestration (run_simulation, run_parameter_sweep)
│
├── config_data/
│   ├── parameters.json         # Configuration schema & defaults
│   └── drivecycles/            # Drive cycle data
│
└── scripts/
    ├── run_server.py           # Start Flask API server
    └── run_local_sim.py        # CLI for local simulations
```

## Running the Application

### Prerequisites
- Python 3.8+
- Node.js 16+ (for frontend)

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install flask flask-cors
   ```

2. **Start the API server:**
   ```bash
   cd scripts
   python run_server.py
   ```
   The server will start at `http://localhost:5000`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

### Using the Web Interface

1. Open the frontend in your browser (usually http://localhost:5173)
2. Configure simulation parameters in the form:
   - **Car Parameters**: mass, target speed, frontal area, etc.
   - **Environment**: temperature, solar irradiance, slope
   - **Simulation Settings**: duration, time step
3. Click "Run Simulation"
4. View results showing distance, time, energy, and power metrics

## API Endpoints

### POST /api/simulate
Run a single simulation with optional parameter overrides.

**Request:**
```json
{
  "car": {
    "mass": 1200,
    "target_speed": 50,
    "battery_capacity": 72000000
  },
  "env": {
    "slope": 0,
    "solar_irradiance": 1000
  },
  "sim": {
    "duration": 86400
  }
}
```

**Response:**
```json
{
  "status": "success",
  "config": {...},
  "history_length": 86400,
  "final_state": {
    "time": 86400,
    "distance": 2500000,
    "energy": 50000000,
    "velocity": 50,
    "power_demand": 1000,
    "power_supply": 900
  },
  "history": [...]
}
```

### POST /api/sweep
Run parameter sweep (Cartesian product of parameter values).

**Request:**
```json
{
  "sweep": {
    "car.mass": [1000, 1200, 1500],
    "env.slope": [0, 2, 5]
  },
  "base": {
    "car": {"target_speed": 50}
  }
}
```

**Response:**
```json
{
  "status": "success",
  "total_runs": 9,
  "successful": 9,
  "results": [
    {
      "status": "success",
      "params": {"car.mass": 1000, "env.slope": 0},
      "final_state": {...}
    },
    ...
  ]
}
```

## Using the CLI

For command-line usage and parameter sweeps:

```bash
cd scripts
python run_local_sim.py --help
```

**Examples:**
```bash
# Run with custom parameters
python run_local_sim.py --set car.mass 1200 env.slope 2

# Run parameter sweep
python run_local_sim.py --sweep car.mass 1000,1200,1500 env.slope 0,2,5

# Run with verbose output
python run_local_sim.py --verbose
```

## Configuration

Default parameters and constraints are defined in `config_data/parameters.json`. This file includes:
- Default values for all parameters
- Type constraints (int, float, etc.)
- Min/max bounds
- Unit information

Configuration merging and validation happens automatically:
1. Default parameters are loaded from JSON
2. User overrides are validated against constraints
3. Validated overrides are merged with defaults
4. Final config is used for simulation

## Physics Model

The simulation uses a discrete-time physics model with:
- **Power Demand**: Based on aerodynamic drag, rolling resistance, and slope
- **Power Supply**: From solar panels adjusted for temperature and irradiance
- **Energy Management**: Battery energy updated each timestep (supply - demand)
- **Stopping Condition**: When battery is depleted or duration exceeded

Parameters are validated at load-time, catching configuration errors immediately.

## Development Notes

### Key Design Decisions

1. **Minimal State Management**: App.jsx uses simple useState hooks instead of Redux
2. **Direct Input Fields**: Form inputs directly modify config state without presets
3. **API-First Backend**: All simulation logic accessible via REST endpoints
4. **Immutable Config**: Config objects prevent accidental modifications
5. **Schema-Based Validation**: parameters.json serves as single source of truth

### Frontend Components

- **App.jsx**: Main component, manages config/results state
- **SimulationForm.jsx**: Input fields for all parameters
- **ResultsPanel.jsx**: Displays final_state metrics
- **api.js**: HTTP client for API communication

### Backend Modules

- **main.py**: High-level orchestration
- **api/routes.py**: HTTP endpoints
- **simulation.py**: Core physics engine
- **config_manager.py**: Validation and merging
- **physics.py**: Physics calculations

## License

[Add your license information here]
