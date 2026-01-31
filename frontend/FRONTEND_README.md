# Solar Car Simulator - Frontend

A clean, optimized React frontend for the Solar Car Simulation system.

## Architecture

### Components

- **App.jsx** - Main application component, handles state and API communication
- **SimulationForm.jsx** - Configuration form with preset selection
- **ParameterSection.jsx** - Reusable parameter input section
- **ResultsPanel.jsx** - Results display with statistics and interactive charts
- **LoadingOverlay.jsx** - Loading indicator overlay

### Features

- **Preset Loading** - Load parameters and presets from JSON files
- **Dynamic Form** - Parameters load from config with type validation
- **Real-time Charts** - SVG-based lightweight charts showing simulation data
- **Responsive Design** - Tailwind CSS for modern UI
- **Error Handling** - Graceful error messages and validation

### Development

```bash
npm install
npm run dev    # Start dev server on localhost:5173
npm run build  # Build for production
```

### Production

The frontend is built with Vite and served by the Flask backend from the `dist/` folder.

```bash
npm run build
# Then start the backend which serves the frontend
```

### API Integration

The frontend communicates with the backend API:

- `POST /api/simulate` - Run single simulation
- `POST /api/sweep` - Run parameter sweep
- `GET /parameters.json` - Load parameter definitions
- `GET /presets.json` - Load preset definitions
