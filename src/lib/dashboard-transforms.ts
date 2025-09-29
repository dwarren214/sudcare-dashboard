import type {
  HourCountEntry,
  TrueFalseCountEntry,
  UserMessagesEntry,
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
