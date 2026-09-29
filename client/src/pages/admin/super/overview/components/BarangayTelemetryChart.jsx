import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  Download01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";

function getSmoothCurvePath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, "");
}

export default function BarangayTelemetryChart({ timelineData }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const chartHeight = 220;
  const chartWidth = 900;
  const paddingX = 42;
  const paddingY = 24;
  const baselineOffset = 10;

  const maxVal = useMemo(() => {
    if (!timelineData.length) return 3;
    const highest = Math.max(
      ...timelineData.map((d) => Math.max(Number(d.residents) || 0, Number(d.trained) || 0)),
      0
    );
    if (highest <= 1) return 3;
    if (highest <= 3) return 4;
    if (highest <= 10) return Math.ceil(highest + 2);
    return Math.ceil(highest / 5) * 5;
  }, [timelineData]);

  const points = useMemo(() => {
    if (!timelineData.length) return { residentPts: [], trainedPts: [] };

    const step = (chartWidth - paddingX * 2) / Math.max(timelineData.length - 1, 1);
    const usableHeight = chartHeight - paddingY * 2 - baselineOffset;
    const baselineY = chartHeight - paddingY - baselineOffset;

    const residentPts = [];
    const trainedPts = [];

    timelineData.forEach((d, i) => {
      const x = paddingX + i * step;
      const resCount = Number(d.residents) || 0;
      const trainCount = Number(d.trained) || 0;

      const yRes = baselineY - (resCount / maxVal) * usableHeight;
      const yTrain = baselineY - (trainCount / maxVal) * usableHeight;

      residentPts.push({ x, y: yRes, data: d });
      trainedPts.push({ x, y: yTrain, data: d });
    });

    return { residentPts, trainedPts };
  }, [timelineData, maxVal]);

  const residentCurve = useMemo(() => getSmoothCurvePath(points.residentPts), [points]);
  const trainedCurve = useMemo(() => getSmoothCurvePath(points.trainedPts), [points]);
  const baselineFloor = chartHeight - paddingY - baselineOffset;

  const residentAreaPath = useMemo(() => {
    if (!points.residentPts.length) return "";
    const firstX = points.residentPts[0].x;
    const lastX = points.residentPts[points.residentPts.length - 1].x;
    return `${residentCurve} L ${lastX},${baselineFloor} L ${firstX},${baselineFloor} Z`;
  }, [residentCurve, points, baselineFloor]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Barangay Engagement & Training Output
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Live comparative registry metrics across all 21 administrative sectors
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium mr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600/70 border border-red-500 inline-block" />
              <span className="text-gray-700 dark:text-slate-300">Registered Residents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-slate-700 dark:bg-slate-300 rounded inline-block" />
              <span className="text-gray-700 dark:text-slate-300">Certified Citizens</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <button type="button" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition" title="Telemetry details">
              <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition" title="Export report">
              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition" title="Filter view">
              <HugeiconsIcon icon={FilterIcon} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto pt-2">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 select-none overflow-visible">
          <defs>
            <linearGradient id="redWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#ef4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const usableHeight = chartHeight - paddingY * 2 - baselineOffset;
            const y = baselineFloor - pct * usableHeight;
            const labelVal = Math.round(pct * maxVal);

            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="stroke-gray-200 dark:stroke-slate-800"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x={paddingX - 10} y={y + 3} textAnchor="end" className="fill-gray-400 dark:fill-slate-500 text-[10px] font-mono">
                  {labelVal}
                </text>
              </g>
            );
          })}

          {residentAreaPath && <path d={residentAreaPath} fill="url(#redWaveGrad)" />}
          {residentCurve && <path d={residentCurve} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" className="drop-shadow-sm" />}
          {trainedCurve && <path d={trainedCurve} fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="dark:stroke-slate-400" />}

          {points.residentPts.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const trainPt = points.trainedPts[i];
            return (
              <g key={i}>
                <rect
                  x={pt.x - 18}
                  y={0}
                  width={36}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {isHovered && (
                  <line x1={pt.x} y1={paddingY} x2={pt.x} y2={baselineFloor} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                )}
                {isHovered && (
                  <>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={trainPt.x} cy={trainPt.y} r="4" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
                  </>
                )}
              </g>
            );
          })}

          {points.residentPts.map((pt, i) => {
            const showLabel = i % 2 === 0 || points.residentPts.length <= 10;
            if (!showLabel) return null;
            return (
              <text key={i} x={pt.x} y={chartHeight - 4} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500 text-[9px] font-medium">
                {pt.data.name.slice(0, 4)}
              </text>
            );
          })}
        </svg>

        {hoveredIndex !== null && points.residentPts[hoveredIndex] && (
          <div
            className="absolute pointer-events-none -top-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-2.5 text-xs z-30 transition-all duration-150"
            style={{
              left: `${Math.min(Math.max((points.residentPts[hoveredIndex].x / chartWidth) * 100, 10), 90)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-bold text-gray-900 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 pb-1 mb-1">
              {timelineData[hoveredIndex]?.name}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                {timelineData[hoveredIndex]?.residents ?? 0} Residents
              </span>
              <span className="text-gray-600 dark:text-slate-300 font-mono">
                {timelineData[hoveredIndex]?.trained ?? 0} Certified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}