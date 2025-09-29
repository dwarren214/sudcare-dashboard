export type DatasetKey = "all" | "exclude_p266";
export type BooleanString = "TRUE" | "FALSE";

export interface WeeklyMessagesEntry {
  week: number;
  messages: number;
}

export interface UserMessagesEntry {
  participant: string;
  count: number;
}

export interface NamedCountEntry {
  name: string;
  count: number;
}

export interface TrueFalseCountEntry {
  able: BooleanString;
  count: number;
}

export interface HourCountEntry {
  hour: number;
  count: number;
}

export interface DashboardMetrics {
  weekly_messages: WeeklyMessagesEntry[];
  messages_by_user: UserMessagesEntry[];
  categories: NamedCountEntry[];
  subcategories: NamedCountEntry[];
  suzy_can_respond: TrueFalseCountEntry[];
  message_times: HourCountEntry[];
}

export interface DashboardData {
  dataset: DatasetKey;
  last_updated: string; // YYYY-MM-DD
  metrics: DashboardMetrics;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class DashboardDataValidationError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const firstIssue = issues[0];
    const message = firstIssue
      ? `Dashboard data validation failed: ${firstIssue.path} — ${firstIssue.message}`
      : "Dashboard data validation failed";
    super(message);
    this.name = "DashboardDataValidationError";
    this.issues = issues;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DashboardDataValidationError);
    }
  }
}

export type DashboardValidationResult =
  | { success: true; data: DashboardData }
  | { success: false; issues: ValidationIssue[] };

const DATASET_VALUES: DatasetKey[] = ["all", "exclude_p266"];
const BOOLEAN_VALUES: BooleanString[] = ["TRUE", "FALSE"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateDashboardData(input: unknown): DashboardValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    issues.push({ path: "root", message: "Expected an object" });
    return { success: false, issues };
  }

  const dataset = input.dataset;
  const lastUpdated = input.last_updated;
  const metrics = input.metrics;

  let datasetValue: DatasetKey | null = null;
  if (typeof dataset === "string" && DATASET_VALUES.includes(dataset as DatasetKey)) {
    datasetValue = dataset as DatasetKey;
  } else {
    issues.push({ path: "dataset", message: "Must be 'all' or 'exclude_p266'" });
  }

  let lastUpdatedValue: string | null = null;
  if (typeof lastUpdated === "string" && DATE_REGEX.test(lastUpdated)) {
    lastUpdatedValue = lastUpdated;
  } else {
    issues.push({
      path: "last_updated",
      message: "Must be a string matching YYYY-MM-DD",
    });
  }

  if (!isRecord(metrics)) {
    issues.push({ path: "metrics", message: "Expected an object" });
  }

  let weeklyMessages: WeeklyMessagesEntry[] | null = null;
  let messagesByUser: UserMessagesEntry[] | null = null;
  let categories: NamedCountEntry[] | null = null;
  let subcategories: NamedCountEntry[] | null = null;
  let suzyCanRespond: TrueFalseCountEntry[] | null = null;
  let messageTimes: HourCountEntry[] | null = null;

  if (isRecord(metrics)) {
    weeklyMessages = validateWeeklyMessages(metrics.weekly_messages, "metrics.weekly_messages", issues);
    messagesByUser = validateUserMessages(metrics.messages_by_user, "metrics.messages_by_user", issues);
    categories = validateNamedCounts(metrics.categories, "metrics.categories", issues);
    subcategories = validateNamedCounts(metrics.subcategories, "metrics.subcategories", issues);
    suzyCanRespond = validateTrueFalseCounts(
      metrics.suzy_can_respond,
      "metrics.suzy_can_respond",
      issues,
    );
    messageTimes = validateHourCounts(metrics.message_times, "metrics.message_times", issues);
  }

  if (
    issues.length > 0 ||
    !datasetValue ||
    !lastUpdatedValue ||
    !weeklyMessages ||
    !messagesByUser ||
    !categories ||
    !subcategories ||
    !suzyCanRespond ||
    !messageTimes
  ) {
    return { success: false, issues };
  }

  const typedData: DashboardData = {
    dataset: datasetValue,
    last_updated: lastUpdatedValue,
    metrics: {
      weekly_messages: weeklyMessages,
      messages_by_user: messagesByUser,
      categories,
      subcategories,
      suzy_can_respond: suzyCanRespond,
      message_times: messageTimes,
    },
  };

  return { success: true, data: typedData };
}

export function parseDashboardData(input: unknown): DashboardData {
  const result = validateDashboardData(input);

  if (result.success) {
    return result.data;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[dashboard-data] Validation failed", result.issues);
  }

  throw new DashboardDataValidationError(result.issues);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateWeeklyMessages(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyMessagesEntry[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  let valid = true;

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      valid = false;
      return;
    }

    const record = entry as Record<string, unknown>;
    const week = record.week;
    const messages = record.messages;

    if (typeof week !== "number" || !Number.isInteger(week) || week < 1) {
      issues.push({ path: `${entryPath}.week`, message: "Must be an integer >= 1" });
      valid = false;
    }

    if (!isFiniteNumber(messages) || (typeof messages === "number" && messages < 0)) {
      issues.push({ path: `${entryPath}.messages`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as WeeklyMessagesEntry[]) : null;
}

function validateUserMessages(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): UserMessagesEntry[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  let valid = true;

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      valid = false;
      return;
    }

    const record = entry as Record<string, unknown>;
    const participant = record.participant;
    const count = record.count;

    if (typeof participant !== "string" || participant.trim().length === 0) {
      issues.push({ path: `${entryPath}.participant`, message: "Must be a non-empty string" });
      valid = false;
    }

    if (!isFiniteNumber(count) || (typeof count === "number" && count < 0)) {
      issues.push({ path: `${entryPath}.count`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as UserMessagesEntry[]) : null;
}

function validateNamedCounts(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): NamedCountEntry[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  let valid = true;

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      valid = false;
      return;
    }

    const record = entry as Record<string, unknown>;
    const name = record.name;
    const count = record.count;

    if (typeof name !== "string" || name.trim().length === 0) {
      issues.push({ path: `${entryPath}.name`, message: "Must be a non-empty string" });
      valid = false;
    }

    if (!isFiniteNumber(count) || (typeof count === "number" && count < 0)) {
      issues.push({ path: `${entryPath}.count`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as NamedCountEntry[]) : null;
}

function validateTrueFalseCounts(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TrueFalseCountEntry[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  let valid = true;

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      valid = false;
      return;
    }

    const record = entry as Record<string, unknown>;
    const able = record.able;
    const count = record.count;

    if (typeof able !== "string" || !BOOLEAN_VALUES.includes(able as BooleanString)) {
      issues.push({ path: `${entryPath}.able`, message: "Must be 'TRUE' or 'FALSE'" });
      valid = false;
    }

    if (!isFiniteNumber(count) || (typeof count === "number" && count < 0)) {
      issues.push({ path: `${entryPath}.count`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as TrueFalseCountEntry[]) : null;
}

function validateHourCounts(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): HourCountEntry[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  let valid = true;

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      valid = false;
      return;
    }

    const record = entry as Record<string, unknown>;
    const hour = record.hour;
    const count = record.count;

    if (typeof hour !== "number" || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      issues.push({ path: `${entryPath}.hour`, message: "Must be an integer between 0 and 23" });
      valid = false;
    }

    if (!isFiniteNumber(count) || (typeof count === "number" && count < 0)) {
      issues.push({ path: `${entryPath}.count`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as HourCountEntry[]) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
