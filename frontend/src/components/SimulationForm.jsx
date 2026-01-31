import { useState } from "react";
import ParameterSection from "./ParameterSection";

export default function SimulationForm({ config, presets, onSubmit }) {
    const [formData, setFormData] = useState({ car: {}, env: {}, sim: {} });
    const [loading, setLoading] = useState(false);
    const [selectedPresets, setSelectedPresets] = useState({
        vehicle: null,
        environment: null,
        drivecycle: null,
    });

    const handlePresetSelect = (category, presetId) => {
        const preset = presets[category]?.find((p) => p.id === presetId);
        if (!preset) return;

        setSelectedPresets((prev) => ({ ...prev, [category]: presetId }));

        // Map category names to section names in formData
        const sectionMap = {
            vehicle: "car",
            environment: "env",
            drivecycle: "sim",
        };

        const section = sectionMap[category] || category;

        if (category === "drivecycle") {
            setFormData((prev) => ({
                ...prev,
                drivecycle: presetId,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [section]: { ...prev[section], ...preset.values },
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
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Parameter Sections with Presets */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <ParameterSection
                    title="Vehicle Parameters"
                    section="car"
                    config={config.car}
                    formData={formData.car}
                    onChange={handleParameterChange}
                    presets={presets?.vehicle}
                    presetCategory="vehicle"
                    selectedPreset={selectedPresets.vehicle}
                    onPresetSelect={handlePresetSelect}
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <ParameterSection
                    title="Environment Parameters"
                    section="env"
                    config={config.env}
                    formData={formData.env}
                    onChange={handleParameterChange}
                    presets={presets?.environment}
                    presetCategory="environment"
                    selectedPreset={selectedPresets.environment}
                    onPresetSelect={handlePresetSelect}
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <ParameterSection
                    title="Simulation Parameters"
                    section="sim"
                    config={config.sim}
                    formData={formData.sim}
                    onChange={handleParameterChange}
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <ParameterSection
                    title="Drive Cycle"
                    section="sim"
                    config={{}}
                    formData={formData.sim}
                    onChange={handleParameterChange}
                    presets={presets?.drivecycle}
                    presetCategory="drivecycle"
                    selectedPreset={selectedPresets.drivecycle}
                    onPresetSelect={handlePresetSelect}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="sticky bottom-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg"
            >
                {loading ? "Running..." : "Run Simulation"}
            </button>
        </form>
    );
}
