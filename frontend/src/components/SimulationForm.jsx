import { useState } from "react";
import ParameterSection from "./ParameterSection";

export default function SimulationForm({ config, presets, onSubmit }) {
    const [formData, setFormData] = useState({ car: {}, env: {}, sim: {} });
    const [loading, setLoading] = useState(false);

    const handlePresetSelect = (category, presetId) => {
        const preset = presets[category]?.find((p) => p.id === presetId);
        if (!preset) return;

        if (category === "drivecycle") {
            setFormData((prev) => ({
                ...prev,
                drivecycle: presetId,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [category]: { ...prev[category], ...preset.values },
            }));
        }
    };

    const handleParameterChange = (section, key, value) => {
        const constraint = config[section][key]?.constraints;
        if (constraint?.read_only) return;

        let numValue = value;
        if (constraint?.type === "float") {
            numValue = parseFloat(value) || 0;
            if (constraint.min !== undefined)
                numValue = Math.max(numValue, constraint.min);
            if (constraint.max !== undefined)
                numValue = Math.min(numValue, constraint.max);
        }

        setFormData((prev) => ({
            ...prev,
            [section]: { ...prev[section], [key]: numValue },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow p-6"
        >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Configuration
            </h2>

            {/* Presets */}
            {presets && (
                <div className="mb-8">
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Vehicle Presets
                        </h3>
                        <select
                            onChange={(e) =>
                                handlePresetSelect("vehicle", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue=""
                        >
                            <option value="">Choose a vehicle...</option>
                            {presets.vehicle?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Environment Presets
                        </h3>
                        <select
                            onChange={(e) =>
                                handlePresetSelect(
                                    "environment",
                                    e.target.value,
                                )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue=""
                        >
                            <option value="">Choose an environment...</option>
                            {presets.environment?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Drive Cycle
                        </h3>
                        <select
                            onChange={(e) =>
                                handlePresetSelect("drivecycle", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue=""
                        >
                            <option value="">Choose a drive cycle...</option>
                            {presets.drivecycle?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <hr className="my-6" />

            {/* Parameter Sections */}
            <ParameterSection
                title="Vehicle Parameters"
                section="car"
                config={config.car}
                formData={formData.car}
                onChange={handleParameterChange}
            />

            <ParameterSection
                title="Environment Parameters"
                section="env"
                config={config.env}
                formData={formData.env}
                onChange={handleParameterChange}
            />

            <ParameterSection
                title="Simulation Parameters"
                section="sim"
                config={config.sim}
                formData={formData.sim}
                onChange={handleParameterChange}
            />

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-8 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
            >
                {loading ? "Running..." : "Run Simulation"}
            </button>
        </form>
    );
}
