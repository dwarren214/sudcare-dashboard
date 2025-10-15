import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Sector, type TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { buildIntentNotMetBreakdown, summarizeAssistantResponses } from "@/lib/dashboard-transforms";
import type { IntentNotMetBreakdown } from "@/lib/dashboard-transforms";
import type { InteractionRecord, NamedCountEntry, TrueFalseCountEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface AssistantResponseChartProps {
  data: TrueFalseCountEntry[];
  className?: string;
  isExpanded?: boolean;
}

interface AssistantResponseWidgetProps extends AssistantResponseChartProps {
  interactions: InteractionRecord[];
}

const TRUE_COLOR = "#22c55e";
const FALSE_COLOR = "#ef4444";

const BREAKDOWN_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

type AssistantResponseView = "overview" | "breakdown";
type BreakdownDimension = "categories" | "subcategories";

export function AssistantResponseWidget({ data, interactions, className, isExpanded = false }: AssistantResponseWidgetProps) {
  const [view, setView] = useState<AssistantResponseView>("overview");
  const summary = useMemo(() => summarizeAssistantResponses(data), [data]);
  const breakdown = useMemo(() => buildIntentNotMetBreakdown(interactions), [interactions]);
  const hasBreakdown = breakdown.total > 0;
  const [dimension, setDimension] = useState<BreakdownDimension>("categories");

  const effectiveView: AssistantResponseView = hasBreakdown ? view : "overview";

  useEffect(() => {
    if (!hasBreakdown) {
      setView("overview");
    }
  }, [hasBreakdown]);

  useEffect(() => {
    if (effectiveView === "overview") {
      setDimension("categories");
    }
  }, [effectiveView]);

  return (
    <div className={cn("flex h-full w-full flex-col gap-4", className)}>
      {hasBreakdown ? (
        <div className="flex items-center justify-center">
          <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setView("overview")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
                effectiveView === "overview"
                  ? "bg-brand-600 text-white shadow-inner"
                  : "bg-white text-slate-600 hover:bg-slate-100",
              )}
            >
              Intent fulfillment
            </button>
            <button
              type="button"
              onClick={() => setView("breakdown")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
                effectiveView === "breakdown"
                  ? "bg-brand-600 text-white shadow-inner"
                  : "bg-white text-slate-600 hover:bg-slate-100",
              )}
            >
              Intent not met
            </button>
          </div>
        </div>
      ) : null}

      {effectiveView === "breakdown" ? (
        <IntentNotMetBreakdownView
          breakdown={breakdown}
          dimension={dimension}
          onDimensionChange={setDimension}
          isExpanded={isExpanded}
        />
      ) : (
        <AssistantResponseChart data={data} isExpanded={isExpanded} className="flex-1" />
      )}

      {hasBreakdown && effectiveView === "breakdown" ? (
        <BreakdownSummary breakdown={breakdown} dimension={dimension} isExpanded={isExpanded} />
      ) : (
        <p className="text-xs text-slate-500">
          {summary.trueCount.toLocaleString()} of {summary.total.toLocaleString()} interactions received a satisfactory response.
        </p>
      )}
    </div>
  );
}

export function AssistantResponseChart({ data, className, isExpanded = false }: AssistantResponseChartProps) {
  const summary = useMemo(() => summarizeAssistantResponses(data), [data]);

  const chartData = useMemo(() => {
    return [
      { name: "Intent met", value: summary.trueCount, label: "intent-met", color: TRUE_COLOR },
      { name: "Intent not met", value: summary.falseCount, label: "intent-not-met", color: FALSE_COLOR },
    ];
  }, [summary.falseCount, summary.trueCount]);

  if (summary.total === 0) {
    return null;
  }

  const innerRadius = isExpanded ? 72 : 64;
  const outerRadius = isExpanded ? 110 : 92;

  return (
    <div className={cn("relative flex h-full w-full flex-col items-center justify-center", className)}>
      <ResponsiveContainer width="100%" height={isExpanded ? 320 : 260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            blendStroke
          >
            {chartData.map((entry) => (
              <Cell key={entry.label} fill={entry.color} stroke="white" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip content={<AssistantResponseTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center space-y-1 text-center"
        style={{ transform: `translateY(${isExpanded ? -14 : -35}px)` }}
      >
        <span className="text-3xl font-semibold leading-none text-slate-900">{summary.percentageTrue}%</span>
        <span className="text-xs uppercase tracking-wide text-slate-500 leading-none">Intent met</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
        {chartData.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
            <span className="font-medium text-slate-700">{entry.name}</span>
            <span className="text-xs text-slate-500">{entry.value.toLocaleString()} msgs</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantResponseTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const label = (item as { name?: string })?.name ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}

interface IntentNotMetBreakdownViewProps {
  breakdown: IntentNotMetBreakdown;
  dimension: BreakdownDimension;
  onDimensionChange: (dimension: BreakdownDimension) => void;
  isExpanded?: boolean;
}

function IntentNotMetBreakdownView({
  breakdown,
  dimension,
  onDimensionChange,
  isExpanded = false,
}: IntentNotMetBreakdownViewProps) {
  const segments = dimension === "categories" ? breakdown.categories : breakdown.subcategories;
  const hasData = segments.length > 0;

  const displayLimit = isExpanded ? segments.length : Math.min(segments.length, 8);
  const primarySegments = segments.slice(0, displayLimit);
  const remainingSegments = segments.slice(displayLimit);
  const otherTotal = remainingSegments.reduce((acc, item) => acc + item.count, 0);

  const chartSegments = otherTotal > 0
    ? [...primarySegments, { name: "Other", count: otherTotal }]
    : primarySegments;

  const pieData = chartSegments.map((item, index) => ({
    name: item.name,
    value: item.count,
    color: BREAKDOWN_PALETTE[index % BREAKDOWN_PALETTE.length],
  }));

  const [activeIndex, setActiveIndex] = useState(() => (pieData.length > 0 ? 0 : -1));

  useEffect(() => {
    if (pieData.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((previous) => {
      if (previous >= 0 && previous < pieData.length) {
        return previous;
      }
      return 0;
    });
  }, [pieData.length]);

  const pieActiveIndex = activeIndex >= 0 ? activeIndex : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => onDimensionChange("categories")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
              dimension === "categories"
                ? "bg-slate-900 text-white shadow-inner"
                : "bg-white text-slate-600 hover:bg-slate-100",
            )}
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => onDimensionChange("subcategories")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
              dimension === "subcategories"
                ? "bg-slate-900 text-white shadow-inner"
                : "bg-white text-slate-600 hover:bg-slate-100",
            )}
          >
            Subcategories
          </button>
        </div>
      </div>

      {hasData ? (
        <div className="flex flex-col gap-4">
          <div className="relative flex h-full min-h-[240px] w-full justify-center">
            <ResponsiveContainer width="100%" height={isExpanded ? 320 : 260}>
              <PieChart margin={isExpanded ? { top: 0, right: 96, bottom: 0, left: 96 } : { top: 0, right: 48, bottom: 0, left: 48 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={isExpanded ? 70 : 56}
                  outerRadius={isExpanded ? 110 : 88}
                  paddingAngle={1}
                  blendStroke
                  activeIndex={pieActiveIndex}
                  activeShape={(props) => renderActiveBreakdownShape({ ...props, isExpanded })}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex((prev) => (prev === -1 ? -1 : prev))}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={1} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
              style={dimension === "subcategories" && isExpanded ? { transform: "translateY(-21px)" } : undefined}
            >
              <span className="text-2xl font-semibold leading-none text-slate-900">{breakdown.total.toLocaleString()}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500 leading-none">Intent not met</span>
            </div>
          </div>
          <div
            className={cn(
              "grid gap-2",
              isExpanded ? "grid-cols-2 max-h-80 overflow-y-auto pr-1" : "grid-cols-1",
            )}
          >
            {pieData.map((segment, index) => (
              <button
                key={segment.name}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  activeIndex === index ? "border-brand-300 bg-brand-50" : "",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden />
                  <span className="font-medium text-slate-700">{segment.name}</span>
                </span>
                <span className="text-xs text-slate-500">{segment.value.toLocaleString()} msgs</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
          No intent-not-met messages in this dataset.
        </div>
      )}
    </div>
  );
}

interface BreakdownSummaryProps {
  breakdown: IntentNotMetBreakdown;
  dimension: BreakdownDimension;
  isExpanded?: boolean;
}

function BreakdownSummary({ breakdown, dimension, isExpanded = false }: BreakdownSummaryProps) {
  const segments = dimension === "categories" ? breakdown.categories : breakdown.subcategories;
  const label = dimension === "categories" ? "categories" : "subcategories";
  const limit = isExpanded ? segments.length : Math.min(segments.length, 8);
  const remaining = Math.max(segments.length - limit, 0);

  if (segments.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No intent-not-met messages in this dataset.
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-500">
      Showing {Math.min(limit, segments.length)} {label}
      {remaining > 0 ? ` (plus ${remaining} more grouped into “Other”)` : ""} across {breakdown.total.toLocaleString()} intent-not-met messages.
    </p>
  );
}

const RADIAN = Math.PI / 180;

interface ActiveShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name: string; value: number; color?: string };
  value: number;
  isExpanded?: boolean;
}

function renderActiveBreakdownShape(props: ActiveShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload, value, isExpanded = false } = props;
  const color = payload.color ?? props.fill;

  const midAngle = (startAngle + endAngle) / 2;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const radiusOffset = Math.min(outerRadius * (isExpanded ? 0.15 : 0.12), isExpanded ? 12 : 8);
  const connectorOffset = Math.min(outerRadius * (isExpanded ? 0.32 : 0.24), isExpanded ? 24 : 16);
  const labelOffset = Math.min(outerRadius * (isExpanded ? 0.5 : 0.32), isExpanded ? 40 : 26);
  const sx = cx + (outerRadius + radiusOffset) * cos;
  const sy = cy + (outerRadius + radiusOffset) * sin;
  const mx = cx + (outerRadius + connectorOffset) * cos;
  const my = cy + (outerRadius + connectorOffset) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * labelOffset;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";
  const labelPadding = Math.min(outerRadius * (isExpanded ? 0.12 : 0.08), isExpanded ? 8 : 5);
  const secondaryPadding = Math.min(outerRadius * (isExpanded ? 0.1 : 0.07), isExpanded ? 6 : 4);
  const markerRadius = Math.max(2, Math.min(outerRadius * 0.035, isExpanded ? 3.5 : 2.5));

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + Math.min(outerRadius * 0.08, 6)}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={color}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={color}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#1f2937" strokeWidth={1} fill="none" />
      <circle cx={ex} cy={ey} r={markerRadius} fill="#1f2937" />
      <text
        x={ex + (cos >= 0 ? labelPadding : -labelPadding)}
        y={ey - (secondaryPadding + 2)}
        textAnchor={textAnchor}
        fill="#1f2937"
        fontSize={12 + Math.min(outerRadius * 0.04, 2)}
        fontWeight={600}
        paintOrder="stroke"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {payload.name}
      </text>
      <text
        x={ex + (cos >= 0 ? labelPadding : -labelPadding)}
        y={ey + secondaryPadding}
        textAnchor={textAnchor}
        fill="#475569"
        fontSize={11 + Math.min(outerRadius * 0.03, 1)}
        paintOrder="stroke"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {value.toLocaleString()} msgs
      </text>
    </g>
  );
}
