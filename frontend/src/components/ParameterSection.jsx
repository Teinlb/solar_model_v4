export default function ParameterSection({
    title,
    section,
    config,
    formData,
    onChange,
}) {
    const getFieldKey = (key) => {
        const mapping = {
            mass: "mass",
            frontal_area: "frontal_area",
            drag_coeff: "drag_coeff",
            rolling_res: "rolling_res",
            target_speed: "target_speed",
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
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {title}
            </h3>
            <div className="space-y-4">
                {Object.entries(config).map(([key, meta]) => {
                    const fieldKey = getFieldKey(key);
                    const value = formData?.[key] ?? meta.default ?? "";
                    const isReadOnly = meta.constraints?.read_only;

                    return (
                        <div key={key}>
                            <label
                                htmlFor={`${section}-${key}`}
                                className="block text-xs font-medium text-gray-600 mb-1"
                            >
                                {meta.ui?.label}
                            </label>
                            {meta.ui?.widget === "slider" && !isReadOnly ? (
                                <div className="flex gap-2 items-center">
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
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 w-12 text-right">
                                        {typeof value === "number"
                                            ? value.toFixed(3)
                                            : value}
                                    </span>
                                </div>
                            ) : (
                                <input
                                    id={`${section}-${key}`}
                                    type="number"
                                    step="any"
                                    value={value}
                                    onChange={(e) =>
                                        onChange(section, key, e.target.value)
                                    }
                                    disabled={isReadOnly}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                            )}
                            {meta.ui?.info && (
                                <p className="text-xs text-gray-500 mt-1">
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
