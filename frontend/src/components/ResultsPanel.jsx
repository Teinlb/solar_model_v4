export default function ResultsPanel({ results }) {
    if (!results) return null;

    const initial = results.initial_state || {};
    const final = results.final_state || {};
    const history = results.history || [];

    console.log(history);

    // Calculate average net power from initial and final states
    const duration = final.time || 1;
    const energyDelta = (initial.energy || 0) - (final.energy || 0);
    const avgPower = duration > 0 ? energyDelta / duration / 1000 : 0;

    const stats = [
        { label: "Duration", value: `${(final.time / 3600).toFixed(1)} h` },
        {
            label: "Distance",
            value: `${(final.distance / 1000).toFixed(2)} km`,
        },
        {
            label: "Final Energy",
            value: `${(final.energy / 1e6).toFixed(2)} MJ`,
        },
        {
            label: "Average Net Power",
            value: `${avgPower.toFixed(2)} kW`,
        },
    ];

    const getChartData = () => {
        // Need at least 2 points for meaningful charts
        if (!history || history.length < 2) return null;
        const step = Math.max(1, Math.floor(history.length / 100));

        // Precompute instantaneous power (kW) from energy differences
        const powerFull = history.map((h, i) => {
            if (i === 0) return 0;
            const dt = h.time - history[i - 1].time || 1;
            const dE = (history[i - 1].energy || 0) - (h.energy || 0);
            return dE / dt / 1000; // convert W -> kW
        });

        // Sample indices so all series stay aligned
        const sampledIdxs = history
            .map((_, i) => i)
            .filter((i) => i % step === 0);

        return {
            labels: sampledIdxs.map((i) => (history[i].time / 3600).toFixed(1)),
            distance: sampledIdxs.map((i) => history[i].distance / 1000),
            energy: sampledIdxs.map((i) => history[i].energy / 1e6),
            velocity: sampledIdxs.map((i) => history[i].velocity),
            power: sampledIdxs.map((i) => powerFull[i]),
        };
    };

    const chartData = getChartData();

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-lg p-4"
                    >
                        <p className="text-xs text-slate-600 mb-1">
                            {stat.label}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Charts - only show if enough history data (2+ points) */}
            {chartData && chartData.labels.length > 0 && (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                            Energy Over Time
                        </h3>
                        <SimpleChart
                            labels={chartData.labels}
                            values={chartData.energy}
                            color="#10b981"
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                            Power Over Time
                        </h3>
                        <SimpleChart
                            labels={chartData.labels}
                            values={chartData.power}
                            color="#8b5cf6"
                            zeroLine={true}
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                            Distance Over Time
                        </h3>
                        <SimpleChart
                            labels={chartData.labels}
                            values={chartData.distance}
                            color="#3b82f6"
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                            Velocity Over Time
                        </h3>
                        <SimpleChart
                            labels={chartData.labels}
                            values={chartData.velocity}
                            color="#f59e0b"
                            zeroLine={true}
                        />
                    </div>
                </>
            )}

            {/* Info message for constant speed simulations */}
            {!chartData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Constant Speed Mode:</strong> Trajectories are
                        linear and can be derived from the summary statistics
                        above.
                    </p>
                </div>
            )}

            {/* Full History Data */}
            {history.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Full History ({history.length} points)
                        </h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                                        Time (h)
                                    </th>
                                    <th className="px-4 py-2 text-right font-semibold text-slate-700">
                                        Distance (km)
                                    </th>
                                    <th className="px-4 py-2 text-right font-semibold text-slate-700">
                                        Velocity (m/s)
                                    </th>
                                    <th className="px-4 py-2 text-right font-semibold text-slate-700">
                                        Energy (MJ)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={
                                            idx % 2 === 0
                                                ? "bg-white"
                                                : "bg-slate-50"
                                        }
                                    >
                                        <td className="px-4 py-2">
                                            {(row.time / 3600).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {(row.distance / 1000).toFixed(3)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {row.velocity?.toFixed(2) || "-"}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {(row.energy / 1e6).toFixed(4)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Lightweight ASCII-style chart
function SimpleChart({
    labels,
    values,
    color,
    zeroLine = false,
    zeroLabel = false,
}) {
    if (!labels || !values || values.length === 0) return null;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Determine if zero is inside the visible range and compute its Y
    const showZero = zeroLine && min <= 0 && max >= 0;
    const zeroY = showZero ? 80 - ((0 - min) / range) * 60 : null;

    return (
        <svg
            viewBox={`0 0 ${Math.max(200, labels.length * 4)} 100`}
            className="w-full h-48 border border-gray-200 rounded"
        >
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((y, i) => (
                <line
                    key={`grid-${i}`}
                    x1="20"
                    y1={80 - y * 60}
                    x2={Math.max(200, labels.length * 4)}
                    y2={80 - y * 60}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                />
            ))}

            {/* Zero line (useful to distinguish positive/negative values) */}
            {showZero && (
                <>
                    <line
                        x1="20"
                        y1={zeroY}
                        x2={Math.max(200, labels.length * 4)}
                        y2={zeroY}
                        stroke="#9ca3af"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                    {zeroLabel && (
                        <text x="5" y={zeroY + 3} fontSize="8" fill="#666">
                            0
                        </text>
                    )}
                </>
            )}

            {/* Line */}
            <polyline
                points={values
                    .map((v, i) => {
                        const x =
                            20 +
                            (i / (values.length - 1 || 1)) *
                                (Math.max(200, labels.length * 4) - 40);
                        const y = 80 - ((v - min) / range) * 60;
                        return `${x},${y}`;
                    })
                    .join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="2"
            />

            {/* Axis labels */}
            <text x="5" y="85" fontSize="8" fill="#666">
                {min.toFixed(1)}
            </text>
            <text x="5" y="25" fontSize="8" fill="#666">
                {max.toFixed(1)}
            </text>
        </svg>
    );
}
