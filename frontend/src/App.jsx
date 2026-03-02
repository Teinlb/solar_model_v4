import { useState, useEffect } from "react";
import "./App.css";
import SimulationForm from "./components/SimulationForm";
import ResultsPanel from "./components/ResultsPanel";
import LoadingOverlay from "./components/LoadingOverlay";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
    const [config, setConfig] = useState(null);
    const [presets, setPresets] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    const loadData = async () => {
        try {
            const [params, presetsData] = await Promise.all([
                fetch("/parameters.json").then((r) => r.json()),
                fetch("/presets.json").then((r) => r.json()),
            ]);
            setConfig(params);
            setPresets(presetsData);
        } catch (err) {
            setError(`Failed to load configuration: ${err.message}`);
        }
    };

    useEffect(() => {
        loadData();
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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-screen-2xl mx-auto px-6 py-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">
                            Solar Car Simulator
                        </h1>
                        <p className="text-slate-600 mt-2">
                            Optimize vehicle performance with solar energy
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition flex items-center gap-2"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Settings
                    </button>
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="max-w-screen-2xl mx-auto w-full px-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Main Content */}
            <main className="relative flex-1 w-full px-2 sm:px-2 py-6 sm:py-2 mb-12">
                {/* overlay is absolute; parent must be relative so it fills the
                    same area as the form/results grid */}
                {loading && <LoadingOverlay />}

                <div className="max-w-screen-2xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {/* Form Section - Left Column */}
                        <div>
                            <div className="sticky top-6">
                                <SimulationForm
                                    config={config}
                                    presets={presets}
                                    onSubmit={runSimulation}
                                />
                            </div>
                        </div>

                        {/* Results Section - Right Column */}
                        <div>
                            {results ? (
                                <ResultsPanel results={results} />
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center min-h-96 flex items-center justify-center">
                                    <div>
                                        <div className="text-slate-400 mb-2">
                                            <svg
                                                className="w-12 h-12 mx-auto"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                />
                                            </svg>
                                        </div>
                                        <p className="text-slate-600 font-medium">
                                            Results will appear here
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Run a simulation to see analysis and
                                            charts
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel
                    config={config}
                    presets={presets}
                    onClose={() => setShowSettings(false)}
                    onUpdate={loadData}
                />
            )}
        </div>
    );
}
