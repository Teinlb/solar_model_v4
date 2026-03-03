export default function ParameterSection({
    title,
    section,
    config,
    formData,
    onChange,
    presets,
    presetCategory,
    selectedPreset,
    onPresetSelect,
}) {
    const getFieldKey = (key) => {
        const mapping = {
            mass: "mass",
            frontal_area: "frontal_area",
            drag_coeff: "drag_coeff",
            rolling_res: "rolling_res",
            battery_capacity: "battery_capacity",
            battery_efficiency: "battery_efficiency",
            available_capacity: "available_capacity",
            initial_charge: "initial_charge",
            motor_efficiency: "motor_efficiency",
            aux_power: "aux_power",
            regen_efficiency: "regen_efficiency",
            panel_area: "panel_area",
            panel_efficiency: "panel_efficiency",
            panel_temp_coeff: "panel_temp_coeff",
            type: "type",
            target_speed: "target_speed",
            ref: "ref",
            air_density: "air_density",
            gravity: "gravity",
            temperature: "temperature",
            wind_speed: "wind_speed",
            wind_direction: "wind_direction",
            solar_irradiance: "solar_irradiance",
            slope: "slope",
            time_step: "time_step",
            duration: "duration",
        };
        return mapping[key] || key;
    };

    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
                {title}
            </h3>

            {/* Preset Buttons */}
            {presets && onPresetSelect && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                    <p className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
                        Quick Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {presets?.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                    onPresetSelect(presetCategory, preset.id)
                                }
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    selectedPreset === preset.id
                                        ? "bg-blue-600 text-white border border-blue-600"
                                        : "bg-slate-50 text-slate-900 border border-slate-200 hover:border-blue-400 hover:bg-blue-50"
                                }`}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {Object.entries(config || {}).map(([key, meta]) => {
                    const fieldKey = getFieldKey(key);
                    const value = formData?.[key] ?? meta.default ?? "";
                    const widgetType = meta.ui?.widget || "input";

                    // Skip if hidden
                    if (widgetType === "hidden") {
                        return null;
                    }

                    // Render read-only widget
                    if (widgetType === "read_only") {
                        return (
                            <div key={key}>
                                <label
                                    htmlFor={`${section}-${key}`}
                                    className="block text-xs font-medium text-slate-700 mb-2"
                                >
                                    {meta.ui?.label}
                                </label>
                                <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-600 font-medium">
                                    {typeof value === "number"
                                        ? value.toFixed(2)
                                        : value}
                                </div>
                                {meta.ui?.info && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {meta.ui.info}
                                    </p>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={key}>
                            <label
                                htmlFor={`${section}-${key}`}
                                className="block text-xs font-medium text-slate-700 mb-2"
                            >
                                {meta.ui?.label}
                            </label>
                            {widgetType === "slider" ? (
                                <div className="flex gap-3 items-center">
                                    <input
                                        id={`${section}-${key}`}
                                        type="range"
                                        min={meta.constraints?.min ?? 0}
                                        max={meta.constraints?.max ?? 100}
                                        step={
                                            (meta.constraints?.max -
                                                meta.constraints?.min) /
                                            100
                                        }
                                        value={value}
                                        onChange={(e) =>
                                            onChange(
                                                section,
                                                key,
                                                e.target.value,
                                            )
                                        }
                                        className="flex-1 accent-blue-600"
                                    />
                                    <span className="text-xs text-slate-600 w-16 text-right font-medium">
                                        {typeof value === "number"
                                            ? value.toFixed(2)
                                            : value}
                                    </span>
                                </div>
                            ) : widgetType === "dropdown" ? (
                                <select
                                    id={`${section}-${key}`}
                                    value={value}
                                    onChange={(e) =>
                                        onChange(section, key, e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">-- Select --</option>
                                    {meta.ui?.options?.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : meta.constraints?.type === "string" ? (
                                <input
                                    id={`${section}-${key}`}
                                    type="text"
                                    value={value}
                                    onChange={(e) =>
                                        onChange(section, key, e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            ) : (
                                <input
                                    id={`${section}-${key}`}
                                    type="number"
                                    step="any"
                                    value={value}
                                    onChange={(e) =>
                                        onChange(section, key, e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            )}
                            {meta.ui?.info && (
                                <p className="text-xs text-slate-500 mt-1">
                                    {meta.ui.info}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
