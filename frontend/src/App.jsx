import { useState, useEffect } from "react";
import "./App.css";
import SimulationForm from "./components/SimulationForm";
import ResultsPanel from "./components/ResultsPanel";
import LoadingOverlay from "./components/LoadingOverlay";

export default function App() {
    const [config, setConfig] = useState(null);
    const [presets, setPresets] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            fetch("/parameters.json").then((r) => r.json()),
            fetch("/presets.json").then((r) => r.json()),
        ])
            .then(([params, presets]) => {
                setConfig(params);
                setPresets(presets);
            })
            .catch((err) =>
                setError(`Failed to load configuration: ${err.message}`),
            );
    }, []);

    const runSimulation = async (formData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!config || !presets)
        return <div className="p-8 text-center">Loading configuration...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Solar Car Simulator
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Optimize vehicle performance with solar panels
                    </p>
                </div>
            </header>

            {error && (
                <div className="max-w-7xl mx-auto px-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <SimulationForm
                        config={config}
                        presets={presets}
                        onSubmit={runSimulation}
                    />
                </div>
                <div className="lg:col-span-2">
                    {loading && <LoadingOverlay />}
                    {results && !loading && <ResultsPanel results={results} />}
                    {!results && !loading && (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            Run a simulation to see results here
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
