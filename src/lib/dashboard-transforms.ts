import type {
  DayHourCountEntry,
  HourCountEntry,
  InteractionRecord,
  NamedCountEntry,
  TrueFalseCountEntry,
  UserMessagesEntry,
  WeekdayName,
  WeeklyMessagesEntry,
} from "../../types/dashboard";

export function normalizeWeeklyMessages(
  entries: WeeklyMessagesEntry[],
  totalWeeks = 12,
): WeeklyMessagesEntry[] {
  const weekMap = new Map<number, WeeklyMessagesEntry>();
  entries.forEach((entry) => {
    if (!weekMap.has(entry.week)) {
      weekMap.set(entry.week, entry);
    }
  });

  const result: WeeklyMessagesEntry[] = [];
  for (let week = 1; week <= totalWeeks; week += 1) {
    const existing = weekMap.get(week);
    result.push(existing ?? { week, messages: 0 });
  }

  return result;
}

export function sortUserMessages(entries: UserMessagesEntry[]): UserMessagesEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (b.entry.count === a.entry.count) {
        return a.index - b.index;
      }
      return b.entry.count - a.entry.count;
    })
    .map(({ entry }) => entry);
}

export function getTopParticipants(
  entries: UserMessagesEntry[],
  limit: number,
): UserMessagesEntry[] {
  if (limit <= 0) {
    return [];
  }

  const sorted = sortUserMessages(entries);
  return sorted.slice(0, limit);
}

export function formatParticipantId(participant: string): string {
  if (participant.length <= 8) {
    return participant;
  }

  return `${participant.slice(0, 6)}…`;
}

export interface AssistantResponseSummary {
  trueCount: number;
  falseCount: number;
  total: number;
  percentageTrue: number;
}

export function summarizeAssistantResponses(entries: TrueFalseCountEntry[]): AssistantResponseSummary {
  const trueEntry = entries.find((item) => item.able === "TRUE");
  const falseEntry = entries.find((item) => item.able === "FALSE");
  const trueCount = trueEntry?.count ?? 0;
  const falseCount = falseEntry?.count ?? 0;
  const total = trueCount + falseCount;
  const percentageTrue = total === 0 ? 0 : Math.round((trueCount / total) * 100);

  return { trueCount, falseCount, total, percentageTrue };
}

export interface HeatmapCell {
  hour: number;
  count: number;
}

export function buildHourlyHeatmap(entries: HourCountEntry[]): HeatmapCell[] {
  const map = new Map<number, number>();
  entries.forEach((entry) => {
    map.set(entry.hour, entry.count);
  });

  const cells: HeatmapCell[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    cells.push({ hour, count: map.get(hour) ?? 0 });
  }

  return cells;
}

const DAY_ORDER: WeekdayName[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface DayHourHeatmapCell extends HeatmapCell {
  day: WeekdayName;
}

export interface DayHourHeatmapRow {
  day: WeekdayName;
  cells: DayHourHeatmapCell[];
}

export function buildDayHourHeatmap(entries: DayHourCountEntry[]): DayHourHeatmapRow[] {
  const dayMap = new Map<WeekdayName, Map<number, number>>();

  entries.forEach((entry) => {
    if (!dayMap.has(entry.day)) {
      dayMap.set(entry.day, new Map());
    }
    dayMap.get(entry.day)!.set(entry.hour, entry.count);
  });

  DAY_ORDER.forEach((day) => {
    if (!dayMap.has(day)) {
      dayMap.set(day, new Map());
    }
  });

  return DAY_ORDER.map((day) => {
    const hourMap = dayMap.get(day) ?? new Map<number, number>();
    const cells: DayHourHeatmapCell[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({ day, hour, count: hourMap.get(hour) ?? 0 });
    }
    return { day, cells };
  });
}

const WEEKDAY_ABBREVIATIONS: Record<WeekdayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function formatWeekdayAbbreviation(day: WeekdayName): string {
  return WEEKDAY_ABBREVIATIONS[day] ?? day.slice(0, 3);
}

export interface IntentNotMetBreakdown {
  total: number;
  categories: NamedCountEntry[];
  subcategories: NamedCountEntry[];
}

const UNCATEGORIZED_LABEL = "Uncategorized";
const UNSPECIFIED_LABEL = "Unspecified";

export function buildIntentNotMetBreakdown(interactions: InteractionRecord[]): IntentNotMetBreakdown {
  const categories = new Map<string, number>();
  const subcategories = new Map<string, number>();
  let total = 0;

  interactions.forEach((interaction) => {
    if (interaction.satisfied !== false) {
      return;
    }

    total += 1;

    const category = normalizeCategoryLabel(interaction.category);
    categories.set(category, (categories.get(category) ?? 0) + 1);

    const subcategory = normalizeSubcategoryLabel(interaction.subcategory);
    subcategories.set(subcategory, (subcategories.get(subcategory) ?? 0) + 1);
  });

  return {
    total,
    categories: sortNamedCounts(categories),
    subcategories: sortNamedCounts(subcategories),
  };
}

function normalizeCategoryLabel(value: string | null | undefined): string {
  const label = (value ?? "").trim();
  return label.length > 0 ? label : UNCATEGORIZED_LABEL;
}

function normalizeSubcategoryLabel(value: string | null | undefined): string {
  const label = (value ?? "").trim();
  return label.length > 0 ? label : UNSPECIFIED_LABEL;
}

function sortNamedCounts(map: Map<string, number>): NamedCountEntry[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.name.localeCompare(b.name);
      }
      return b.count - a.count;
    });
}
