import { useState } from "react";

export default function SettingsPanel({ config, presets, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState("presets");
    const [editPresets, setEditPresets] = useState(
        JSON.parse(JSON.stringify(presets)),
    );
    const [editConfig, setEditConfig] = useState(
        JSON.parse(JSON.stringify(config)),
    );
    const [saveStatus, setSaveStatus] = useState(null);

    const handleSave = async () => {
        setSaveStatus("saving");
        try {
            const responses = await Promise.all([
                fetch("/api/save-presets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editPresets),
                }),
                fetch("/api/save-config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editConfig),
                }),
            ]);

            for (const res of responses) {
                if (!res.ok) throw new Error("Save failed");
            }

            setSaveStatus("success");
            setTimeout(() => {
                onUpdate();
                onClose();
            }, 1000);
        } catch (err) {
            setSaveStatus("error");
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900">
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 px-6 pt-4 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("presets")}
                        className={`px-4 py-2 font-medium border-b-2 transition ${
                            activeTab === "presets"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Presets
                    </button>
                    <button
                        onClick={() => setActiveTab("parameters")}
                        className={`px-4 py-2 font-medium border-b-2 transition ${
                            activeTab === "parameters"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Parameters
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "presets" && (
                        <PresetsEditor
                            presets={editPresets}
                            config={editConfig}
                            onChange={setEditPresets}
                        />
                    )}
                    {activeTab === "parameters" && (
                        <ParametersEditor
                            config={editConfig}
                            onChange={setEditConfig}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 flex gap-4 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveStatus === "saving"}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
                    >
                        {saveStatus === "saving"
                            ? "Saving..."
                            : saveStatus === "success"
                              ? "✓ Saved"
                              : saveStatus === "error"
                                ? "✗ Error"
                                : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PresetsEditor({ presets, config, onChange }) {
    const [expandedCategory, setExpandedCategory] = useState("vehicle");

    const updatePreset = (category, index, field, value) => {
        const updated = JSON.parse(JSON.stringify(presets));
        if (field.startsWith("values.")) {
            const key = field.split(".")[1];
            updated[category][index].values[key] = parseFloat(value) || value;
        } else {
            updated[category][index][field] = value;
        }
        onChange(updated);
    };

    const addPreset = (category) => {
        const updated = JSON.parse(JSON.stringify(presets));
        const newId = `new_${Date.now()}`;
        updated[category].push({
            id: newId,
            name: "New Preset",
            description: "",
            values: {},
        });
        onChange(updated);
    };

    const deletePreset = (category, index) => {
        const updated = JSON.parse(JSON.stringify(presets));
        updated[category].splice(index, 1);
        onChange(updated);
    };

    const deletePresetValue = (category, presetIndex, paramKey) => {
        const updated = JSON.parse(JSON.stringify(presets));
        delete updated[category][presetIndex].values[paramKey];
        onChange(updated);
    };

    const addPresetValue = (category, presetIndex, paramKey) => {
        const updated = JSON.parse(JSON.stringify(presets));
        updated[category][presetIndex].values[paramKey] = "";
        onChange(updated);
    };

    // Get section key for config lookup
    const getCategorySection = (category) => {
        const map = { vehicle: "car", environment: "env", drivecycle: "sim" };
        return map[category] || category;
    };

    // Get parameter label from config
    const getParamLabel = (category, paramKey) => {
        const section = getCategorySection(category);
        if (!config[section] || !config[section][paramKey]) {
            return paramKey;
        }
        return config[section][paramKey].ui?.label || paramKey;
    };

    return (
        <div className="space-y-6">
            {Object.entries(presets).map(([category, items]) => (
                <div
                    key={category}
                    className="border border-slate-200 rounded-lg p-4"
                >
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() =>
                            setExpandedCategory(
                                expandedCategory === category ? null : category,
                            )
                        }
                    >
                        <h3 className="text-lg font-semibold text-slate-900 capitalize">
                            {category}
                        </h3>
                        <span className="text-slate-500">
                            {expandedCategory === category ? "▼" : "▶"}
                        </span>
                    </div>

                    {expandedCategory === category && (
                        <div className="mt-4 space-y-4">
                            {items.map((preset, idx) => (
                                <div
                                    key={idx}
                                    className="border border-slate-200 rounded p-4 bg-slate-50"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="ID"
                                            value={preset.id}
                                            onChange={(e) =>
                                                updatePreset(
                                                    category,
                                                    idx,
                                                    "id",
                                                    e.target.value,
                                                )
                                            }
                                            className="px-3 py-2 border border-slate-300 rounded text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={preset.name}
                                            onChange={(e) =>
                                                updatePreset(
                                                    category,
                                                    idx,
                                                    "name",
                                                    e.target.value,
                                                )
                                            }
                                            className="px-3 py-2 border border-slate-300 rounded text-sm"
                                        />
                                    </div>
                                    <textarea
                                        placeholder="Description"
                                        value={preset.description || ""}
                                        onChange={(e) =>
                                            updatePreset(
                                                category,
                                                idx,
                                                "description",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm mt-2"
                                        rows="2"
                                    />
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-slate-700 mb-3">
                                            Parameter Values
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(
                                                preset.values || {},
                                            ).map(([key, val]) => {
                                                const section =
                                                    getCategorySection(
                                                        category,
                                                    );
                                                const paramLabel =
                                                    getParamLabel(
                                                        category,
                                                        key,
                                                    );
                                                return (
                                                    <div key={key}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-xs font-medium text-slate-600">
                                                                {paramLabel}
                                                            </label>
                                                            <button
                                                                onClick={() =>
                                                                    deletePresetValue(
                                                                        category,
                                                                        idx,
                                                                        key,
                                                                    )
                                                                }
                                                                className="text-red-500 text-xs hover:text-red-700"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={val}
                                                            onChange={(e) =>
                                                                updatePreset(
                                                                    category,
                                                                    idx,
                                                                    `values.${key}`,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add Parameter Button */}
                                        {(() => {
                                            const section =
                                                getCategorySection(category);
                                            const availableParams =
                                                Object.entries(
                                                    config[section] || {},
                                                )
                                                    .filter(
                                                        ([key]) =>
                                                            !preset.values[key],
                                                    )
                                                    .map(([key]) => key);

                                            return availableParams.length >
                                                0 ? (
                                                <div className="mt-3 flex gap-2">
                                                    <select
                                                        id={`add_param_${idx}`}
                                                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                                        defaultValue=""
                                                    >
                                                        <option value="">
                                                            -- Select parameter
                                                        </option>
                                                        {availableParams.map(
                                                            (key) => (
                                                                <option
                                                                    key={key}
                                                                    value={key}
                                                                >
                                                                    {getParamLabel(
                                                                        category,
                                                                        key,
                                                                    )}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            const select =
                                                                document.getElementById(
                                                                    `add_param_${idx}`,
                                                                );
                                                            if (
                                                                select &&
                                                                select.value
                                                            ) {
                                                                addPresetValue(
                                                                    category,
                                                                    idx,
                                                                    select.value,
                                                                );
                                                                select.value =
                                                                    "";
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                    <button
                                        onClick={() =>
                                            deletePreset(category, idx)
                                        }
                                        className="mt-3 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addPreset(category)}
                                className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-medium transition"
                            >
                                + Add Preset
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function ParametersEditor({ config, onChange }) {
    const [expandedSection, setExpandedSection] = useState("car");

    const updateParameter = (section, paramKey, field, value) => {
        const updated = JSON.parse(JSON.stringify(config));
        if (field.startsWith("constraints.")) {
            const constraintKey = field.split(".")[1];
            updated[section][paramKey].constraints[constraintKey] = isNaN(value)
                ? value
                : parseFloat(value) || 0;
        } else if (field.startsWith("ui.")) {
            const uiKey = field.split(".")[1];
            updated[section][paramKey].ui[uiKey] = value;
        } else if (field.startsWith("ui.options.")) {
            const [_, index, optionField] = field.split(".");
            updated[section][paramKey].ui.options[parseInt(index)][
                optionField
            ] = value;
        } else {
            updated[section][paramKey][field] = isNaN(value)
                ? value
                : parseFloat(value);
        }
        onChange(updated);
    };

    const addOption = (section, paramKey) => {
        const updated = JSON.parse(JSON.stringify(config));
        if (!updated[section][paramKey].ui.options) {
            updated[section][paramKey].ui.options = [];
        }
        updated[section][paramKey].ui.options.push({
            value: "",
            label: "",
        });
        onChange(updated);
    };

    const deleteOption = (section, paramKey, optionIndex) => {
        const updated = JSON.parse(JSON.stringify(config));
        updated[section][paramKey].ui.options.splice(optionIndex, 1);
        onChange(updated);
    };

    const addParameter = (section) => {
        const updated = JSON.parse(JSON.stringify(config));
        const newKey = `new_param_${Date.now()}`;
        updated[section][newKey] = {
            default: 0,
            constraints: { type: "float" },
            ui: {
                label: "New Parameter",
                widget: "input",
                info: "",
            },
        };
        onChange(updated);
    };

    const deleteParameter = (section, paramKey) => {
        const updated = JSON.parse(JSON.stringify(config));
        delete updated[section][paramKey];
        onChange(updated);
    };

    const widgetTypes = [
        { value: "input", label: "Input" },
        { value: "slider", label: "Slider" },
        { value: "dropdown", label: "Dropdown" },
        { value: "frontal", label: "Frontal" },
        { value: "read_only", label: "Read-only" },
        { value: "hidden", label: "Hidden" },
    ];

    return (
        <div className="space-y-4">
            {Object.entries(config).map(([section, params]) => (
                <div
                    key={section}
                    className="border border-slate-200 rounded-lg p-4"
                >
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() =>
                            setExpandedSection(
                                expandedSection === section ? null : section,
                            )
                        }
                    >
                        <h3 className="text-lg font-semibold text-slate-900 capitalize">
                            {section === "car"
                                ? "Vehicle"
                                : section === "env"
                                  ? "Environment"
                                  : section === "profile"
                                    ? "Profile"
                                    : "Simulation"}{" "}
                            Parameters
                        </h3>
                        <span className="text-slate-500">
                            {expandedSection === section ? "▼" : "▶"}
                        </span>
                    </div>

                    {expandedSection === section && (
                        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                            {Object.entries(params).map(([key, param]) => {
                                const currentWidget =
                                    param.ui?.widget || "input";
                                return (
                                    <div
                                        key={key}
                                        className="border border-slate-200 rounded p-4 bg-slate-50"
                                    >
                                        {/* Parameter Name & Delete */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="font-semibold text-slate-900 text-sm">
                                                {param.ui?.label || key}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    deleteParameter(
                                                        section,
                                                        key,
                                                    )
                                                }
                                                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                            >
                                                Delete Param
                                            </button>
                                        </div>

                                        {/* Key (read-only) */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Key
                                            </label>
                                            <input
                                                type="text"
                                                value={key}
                                                disabled
                                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-100"
                                            />
                                        </div>

                                        {/* Default Value */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Default Value
                                            </label>
                                            <input
                                                type="text"
                                                value={param.default || ""}
                                                onChange={(e) =>
                                                    updateParameter(
                                                        section,
                                                        key,
                                                        "default",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                            />
                                        </div>

                                        {/* Label Field */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Display Label
                                            </label>
                                            <input
                                                type="text"
                                                value={param.ui?.label || ""}
                                                onChange={(e) =>
                                                    updateParameter(
                                                        section,
                                                        key,
                                                        "ui.label",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                            />
                                        </div>

                                        {/* Widget Type Buttons */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                                Widget Type
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {widgetTypes.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() =>
                                                            updateParameter(
                                                                section,
                                                                key,
                                                                "ui.widget",
                                                                type.value,
                                                            )
                                                        }
                                                        className={`px-3 py-2 rounded text-xs font-medium transition ${
                                                            currentWidget ===
                                                            type.value
                                                                ? "bg-blue-600 text-white border border-blue-600"
                                                                : "bg-white text-slate-700 border border-slate-300 hover:border-blue-400"
                                                        }`}
                                                    >
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Info Text
                                            </label>
                                            <textarea
                                                value={param.ui?.info || ""}
                                                onChange={(e) =>
                                                    updateParameter(
                                                        section,
                                                        key,
                                                        "ui.info",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                                rows="2"
                                            />
                                        </div>

                                        {/* Constraints */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                                Constraint Type
                                            </label>
                                            <select
                                                value={
                                                    param.constraints?.type ||
                                                    "float"
                                                }
                                                onChange={(e) =>
                                                    updateParameter(
                                                        section,
                                                        key,
                                                        "constraints.type",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                            >
                                                <option value="float">
                                                    Float
                                                </option>
                                                <option value="string">
                                                    String
                                                </option>
                                                <option value="int">
                                                    Integer
                                                </option>
                                            </select>
                                        </div>

                                        {param.constraints?.type ===
                                            "float" && (
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                                        Min Value
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            param.constraints
                                                                ?.min ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            updateParameter(
                                                                section,
                                                                key,
                                                                "constraints.min",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                                        Max Value
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            param.constraints
                                                                ?.max ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            updateParameter(
                                                                section,
                                                                key,
                                                                "constraints.max",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Dropdown Options */}
                                        {currentWidget === "dropdown" && (
                                            <div className="mb-3 border-t pt-3">
                                                <label className="block text-xs font-medium text-slate-700 mb-2">
                                                    Dropdown Options
                                                </label>
                                                <div className="space-y-2">
                                                    {(
                                                        param.ui?.options || []
                                                    ).map((option, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex gap-2 items-end"
                                                        >
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-slate-600 mb-1">
                                                                    Value
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        option.value ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateParameter(
                                                                            section,
                                                                            key,
                                                                            `ui.options.${idx}.value`,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Value"
                                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-slate-600 mb-1">
                                                                    Label
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        option.label ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateParameter(
                                                                            section,
                                                                            key,
                                                                            `ui.options.${idx}.label`,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Label"
                                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    deleteOption(
                                                                        section,
                                                                        key,
                                                                        idx,
                                                                    )
                                                                }
                                                                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        addOption(section, key)
                                                    }
                                                    className="mt-2 w-full py-1 border-2 border-dashed border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                                                >
                                                    + Add Option
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => addParameter(section)}
                                className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-medium transition"
                            >
                                + Add Parameter
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
