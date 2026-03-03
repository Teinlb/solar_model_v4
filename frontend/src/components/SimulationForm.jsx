import { useState } from "react";
import ParameterSection from "./ParameterSection";

export default function SimulationForm({ config, presets, onSubmit }) {
    // form data is intentionally kept minimal; when a key is missing the
    // `ParameterSection` component will fall back to the `meta.default` value
    // defined in the configuration.  This makes it easy to "reset" simply by
    // clearing the object, and avoids the need to rebuild the default object
    // from the config every time.
    const [formData, setFormData] = useState({
        car: {},
        profile: {},
        env: {},
        sim: {},
    });
    const [loading, setLoading] = useState(false);
    const [selectedPresets, setSelectedPresets] = useState({
        vehicle: null,
        profile: null,
        environment: null,
    });

    const resetForm = () => {
        setFormData({ car: {}, profile: {}, env: {}, sim: {} });
        setSelectedPresets({
            vehicle: null,
            profile: null,
            environment: null,
        });
    };

    const handlePresetSelect = (category, presetId) => {
        const preset = presets[category]?.find((p) => p.id === presetId);
        if (!preset) return;

        setSelectedPresets((prev) => ({ ...prev, [category]: presetId }));

        // Map category names to section names in formData
        const sectionMap = {
            vehicle: "car",
            profile: "profile",
            environment: "env",
        };

        const section = sectionMap[category] || category;

        setFormData((prev) => ({
            ...prev,
            [section]: { ...prev[section], ...preset.values },
        }));
    };

    const handleParameterChange = (section, key, value) => {
        if (loading) return; // ignore input while we're running a simulation
        const constraint = config[section][key]?.constraints;
        if (constraint?.read_only) return;

        let finalValue = value;
        if (constraint?.type === "float") {
            finalValue = parseFloat(value);
            // allow NaN during typing; will be coerced later by backend
            if (isNaN(finalValue)) finalValue = value;
        }

        setFormData((prev) => ({
            ...prev,
            [section]: { ...prev[section], [key]: finalValue },
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
        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Left Column - Vehicle Parameters */}
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

                {/* Right Column - Other Sections */}
                <div className="space-y-2">
                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <ParameterSection
                            title="Speed Profile"
                            section="profile"
                            config={config.profile}
                            formData={formData.profile}
                            onChange={handleParameterChange}
                            presets={presets?.profile}
                            presetCategory="profile"
                            selectedPreset={selectedPresets.profile}
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
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="sticky bottom-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg"
            >
                {loading ? "Running..." : "Run Simulation"}
            </button>

            <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="mt-2 w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-semibold transition shadow-lg"
            >
                Reset to defaults
            </button>
        </form>
    );
}
