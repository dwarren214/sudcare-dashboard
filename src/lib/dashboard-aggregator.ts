import type {
  DashboardData,
  DashboardMetrics,
  DatasetKey,
  DayHourCountEntry,
  HourCountEntry,
  InteractionRecord,
  NamedCountEntry,
  NormalizedDashboardDataset,
  ParticipantSummary,
  CalendarWeekMessagesEntry,
  TrueFalseCountEntry,
  UserMessagesEntry,
  WeekdayName,
  WeeklyMessagesEntry,
} from "../../types/dashboard";

const WEEKDAY_NORMALIZATION_MAP: Record<string, WeekdayName> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export interface BuildDashboardDataOptions {
  datasetKey: DatasetKey;
  fallbackLastUpdated?: string;
}

export interface BuildDashboardDataResult {
  dashboard: DashboardData;
  participants: ParticipantSummary[];
}

export function buildDashboardDataFromNormalizedDataset(
  dataset: NormalizedDashboardDataset,
  options: BuildDashboardDataOptions,
): BuildDashboardDataResult {
  const interactions = dataset.interactions ?? [];
  const participants = dataset.participants ?? [];
  const metrics = buildMetrics(interactions);

  const lastUpdated =
    dataset.meta.last_updated ??
    inferLastUpdated(interactions) ??
    options.fallbackLastUpdated ??
    new Date().toISOString().slice(0, 10);

  const dashboard: DashboardData = {
    dataset: options.datasetKey,
    last_updated: lastUpdated,
    metrics,
  };

  return { dashboard, participants };
}

export function buildMetrics(interactions: InteractionRecord[]): DashboardMetrics {
  return {
    weekly_messages: buildWeeklyMessages(interactions),
    messages_by_user: buildMessagesByUser(interactions),
    categories: buildCategoryCounts(interactions),
    subcategories: buildSubcategoryCounts(interactions),
    suzy_can_respond: buildSatisfactionCounts(interactions),
    message_times: buildMessageTimes(interactions),
    message_times_by_day: buildMessageTimesByDay(interactions),
    messages_by_calendar_week: buildMessagesByCalendarWeek(interactions),
  };
}

function buildWeeklyMessages(interactions: InteractionRecord[]): WeeklyMessagesEntry[] {
  const weekCounts = new Map<number, number>();
  let maxWeek = 0;

  interactions.forEach((record) => {
    const week = record.study_week;
    if (typeof week === "number" && Number.isInteger(week) && week > 0) {
      weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
      if (week > maxWeek) {
        maxWeek = week;
      }
    }
  });

  if (maxWeek === 0) {
    return [];
  }

  const result: WeeklyMessagesEntry[] = [];
  for (let week = 1; week <= maxWeek; week += 1) {
    result.push({
      week,
      messages: weekCounts.get(week) ?? 0,
    });
  }

  return result;
}

function buildMessagesByCalendarWeek(interactions: InteractionRecord[]): CalendarWeekMessagesEntry[] {
  const counts = new Map<
    string,
    {
      weekStart: string;
      messages: number;
    }
  >();

  interactions.forEach((record) => {
    const date = resolveInteractionDate(record);
    if (!date) {
      return;
    }

    const info = getIsoWeekInfo(date);
    const existing = counts.get(info.isoWeek);
    if (existing) {
      existing.messages += 1;
    } else {
      counts.set(info.isoWeek, { weekStart: info.weekStart, messages: 1 });
    }
  });

  return [...counts.entries()]
    .map(([isoWeek, { weekStart, messages }]) => ({
      isoWeek,
      weekStart,
      messages,
    }))
    .sort((a, b) => {
      if (a.weekStart === b.weekStart) {
        return a.isoWeek.localeCompare(b.isoWeek);
      }
      return a.weekStart.localeCompare(b.weekStart);
    });
}

function buildMessagesByUser(interactions: InteractionRecord[]): UserMessagesEntry[] {
  const counts = new Map<string, number>();

  interactions.forEach((record) => {
    const participant = (record.participant ?? "").trim();
    if (!participant) {
      return;
    }
    counts.set(participant, (counts.get(participant) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([participant, count]) => ({ participant, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.participant.localeCompare(b.participant);
      }
      return b.count - a.count;
    });
}

function buildCategoryCounts(interactions: InteractionRecord[]): NamedCountEntry[] {
  const counts = new Map<string, number>();

  interactions.forEach((record) => {
    const category = normalizeCategory(record.category);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return sortNamedCounts(counts);
}

function buildSubcategoryCounts(interactions: InteractionRecord[]): NamedCountEntry[] {
  const counts = new Map<string, number>();

  interactions.forEach((record) => {
    const subcategory = normalizeSubcategory(record.subcategory);
    if (!subcategory) {
      return;
    }
    counts.set(subcategory, (counts.get(subcategory) ?? 0) + 1);
  });

  return sortNamedCounts(counts);
}

function buildSatisfactionCounts(interactions: InteractionRecord[]): TrueFalseCountEntry[] {
  let trueCount = 0;
  let falseCount = 0;

  interactions.forEach((record) => {
    if (record.satisfied === true) {
      trueCount += 1;
    } else if (record.satisfied === false) {
      falseCount += 1;
    }
  });

  return [
    { able: "TRUE", count: trueCount },
    { able: "FALSE", count: falseCount },
  ];
}

function buildMessageTimes(interactions: InteractionRecord[]): HourCountEntry[] {
  const hourMap = new Map<number, number>();

  interactions.forEach((record) => {
    const hour = resolveHour(record);
    if (hour === null) {
      return;
    }
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  });

  const result: HourCountEntry[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    result.push({
      hour,
      count: hourMap.get(hour) ?? 0,
    });
  }

  return result;
}

function buildMessageTimesByDay(interactions: InteractionRecord[]): DayHourCountEntry[] {
  const counts = new Map<WeekdayName, Map<number, number>>();

  interactions.forEach((record) => {
    const day = normalizeWeekday(record.day_of_week);
    const hour = resolveHour(record);

    if (!day || hour === null) {
      return;
    }

    if (!counts.has(day)) {
      counts.set(day, new Map());
    }
    const hourMap = counts.get(day)!;
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  });

  const result: DayHourCountEntry[] = [];
  counts.forEach((hourMap, day) => {
    hourMap.forEach((count, hour) => {
      result.push({ day, hour, count });
    });
  });

  return result.sort((a, b) => {
    if (a.day === b.day) {
      return a.hour - b.hour;
    }
    return WEEKDAY_ORDER.indexOf(a.day) - WEEKDAY_ORDER.indexOf(b.day);
  });
}

const WEEKDAY_ORDER: WeekdayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normalizeCategory(value: string | null): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Uncategorized";
}

function normalizeSubcategory(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sortNamedCounts(counts: Map<string, number>): NamedCountEntry[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.name.localeCompare(b.name);
      }
      return b.count - a.count;
    });
}

function resolveHour(record: InteractionRecord): number | null {
  if (typeof record.message_time_fraction === "number") {
    const hourFromFraction = Math.floor(record.message_time_fraction * 24);
    if (Number.isInteger(hourFromFraction) && hourFromFraction >= 0 && hourFromFraction <= 23) {
      return hourFromFraction;
    }
  }

  if (typeof record.occurred_at === "string") {
    const date = new Date(record.occurred_at);
    if (!Number.isNaN(date.getTime())) {
      return date.getHours();
    }
  }

  return null;
}

function normalizeWeekday(value: string | null): WeekdayName | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return WEEKDAY_NORMALIZATION_MAP[normalized] ?? null;
}

function resolveInteractionDate(record: InteractionRecord): Date | null {
  if (typeof record.occurred_at === "string") {
    const occurred = new Date(record.occurred_at);
    if (!Number.isNaN(occurred.getTime())) {
      return occurred;
    }
  }

  if (typeof record.message_date === "string") {
    const date = new Date(`${record.message_date}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function getIsoWeekInfo(date: Date): { isoWeek: string; weekStart: string } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  const weekStart = new Date(utcDate);
  weekStart.setUTCDate(utcDate.getUTCDate() - 3);

  return {
    isoWeek: `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`,
    weekStart: formatDateUtc(weekStart),
  };
}

function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inferLastUpdated(interactions: InteractionRecord[]): string | null {
  let latest: string | null = null;

  interactions.forEach((record) => {
    const date =
      (typeof record.message_date === "string" && record.message_date) ||
      (typeof record.occurred_at === "string" ? record.occurred_at.slice(0, 10) : null);

    if (!date) {
      return;
    }

    if (!latest || date > latest) {
      latest = date;
    }
  });

  return latest;
}
