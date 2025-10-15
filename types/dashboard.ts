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

export type WeekdayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface HourCountEntry {
  hour: number;
  count: number;
}

export interface DayHourCountEntry {
  day: WeekdayName;
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
  message_times_by_day: DayHourCountEntry[];
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
const WEEKDAY_VALUES: WeekdayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  let messageTimesByDay: DayHourCountEntry[] | null = null;

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
    messageTimesByDay = validateDayHourCounts(
      metrics.message_times_by_day,
      "metrics.message_times_by_day",
      issues,
    );
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
    !messageTimes ||
    !messageTimesByDay
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
      message_times_by_day: messageTimesByDay,
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

function validateDayHourCounts(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): DayHourCountEntry[] | null {
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
    const day = record.day;
    const hour = record.hour;
    const count = record.count;

    if (typeof day !== "string" || !WEEKDAY_VALUES.includes(day as WeekdayName)) {
      issues.push({
        path: `${entryPath}.day`,
        message: "Must be a full weekday name (e.g., Monday)",
      });
      valid = false;
    }

    if (typeof hour !== "number" || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      issues.push({ path: `${entryPath}.hour`, message: "Must be an integer between 0 and 23" });
      valid = false;
    }

    if (!isFiniteNumber(count) || (typeof count === "number" && count < 0)) {
      issues.push({ path: `${entryPath}.count`, message: "Must be a non-negative number" });
      valid = false;
    }
  });

  return valid ? (value as DayHourCountEntry[]) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface NormalizedDatasetMeta {
  dataset: string;
  generated_at: string;
  source_workbook: string;
  record_count: number;
  last_updated: string | null;
}

export interface InteractionRecord {
  message_id: string;
  participant: string;
  message_date: string | null;
  message_time_fraction: number | null;
  occurred_at: string | null;
  day_of_week: string | null;
  category: string | null;
  subcategory: string | null;
  category_justification: string | null;
  satisfied: boolean | null;
  satisfaction_justification: string | null;
  registration_date: string | null;
  study_week: number | null;
  response_latency_seconds: number | null;
  emergency_response: boolean | null;
  input_cost: number | null;
  output_cost: number | null;
  total_cost: number | null;
}

export interface ParticipantSummary {
  participant: string;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  total_input_cost: number;
  total_output_cost: number;
  total_cost: number;
}

export interface NormalizedDashboardDataset {
  meta: NormalizedDatasetMeta;
  interactions: InteractionRecord[];
  participants: ParticipantSummary[];
  preaggregated?: DashboardData;
}

export interface NormalizedValidationIssue extends ValidationIssue {}

export type NormalizedDashboardValidationResult =
  | { success: true; data: NormalizedDashboardDataset }
  | { success: false; issues: ValidationIssue[] };

export class NormalizedDashboardValidationError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const firstIssue = issues[0];
    const message = firstIssue
      ? `Normalized dashboard data validation failed: ${firstIssue.path} — ${firstIssue.message}`
      : "Normalized dashboard data validation failed";
    super(message);
    this.name = "NormalizedDashboardValidationError";
    this.issues = issues;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NormalizedDashboardValidationError);
    }
  }
}

export function validateNormalizedDashboardDataset(input: unknown): NormalizedDashboardValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    issues.push({ path: "root", message: "Expected an object" });
    return { success: false, issues };
  }

  const meta = input.meta;
  const interactionsValue = input.interactions;
  const participantsValue = input.participants;

  const metaValue = validateNormalizedMeta(meta, "meta", issues);
  const interactions = validateInteractionRecords(interactionsValue, "interactions", issues);
  const participants = validateParticipantSummaries(participantsValue, "participants", issues);

  let preaggregated: DashboardData | undefined;
  if ("preaggregated" in input) {
    const result = validateDashboardData(input.preaggregated);
    if (result.success) {
      preaggregated = result.data;
    } else {
      issues.push(...result.issues.map((issue) => ({ ...issue, path: `preaggregated.${issue.path}` })));
    }
  }

  if (!metaValue || !interactions || !participants || issues.length > 0) {
    return { success: false, issues };
  }

  const dataset: NormalizedDashboardDataset = {
    meta: metaValue,
    interactions,
    participants,
    ...(preaggregated ? { preaggregated } : {}),
  };

  return { success: true, data: dataset };
}

export function parseNormalizedDashboardDataset(input: unknown): NormalizedDashboardDataset {
  const result = validateNormalizedDashboardDataset(input);
  if (result.success) {
    return result.data;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[dashboard-data] Normalized validation failed", result.issues);
  }

  throw new NormalizedDashboardValidationError(result.issues);
}

function validateNormalizedMeta(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): NormalizedDatasetMeta | null {
  if (!isRecord(input)) {
    issues.push({ path, message: "Expected an object" });
    return null;
  }

  const dataset = input.dataset;
  const generatedAt = input.generated_at;
  const sourceWorkbook = input.source_workbook;
  const recordCount = input.record_count;
  const lastUpdated = "last_updated" in input ? input.last_updated : null;

  let datasetValue: string | null = null;
  if (typeof dataset === "string" && dataset.trim().length > 0) {
    datasetValue = dataset;
  } else {
    issues.push({ path: `${path}.dataset`, message: "Must be a non-empty string" });
  }

  let generatedAtValue: string | null = null;
  if (typeof generatedAt === "string" && generatedAt.trim().length > 0) {
    generatedAtValue = generatedAt;
  } else {
    issues.push({ path: `${path}.generated_at`, message: "Must be a non-empty string" });
  }

  let sourceWorkbookValue: string | null = null;
  if (typeof sourceWorkbook === "string" && sourceWorkbook.trim().length > 0) {
    sourceWorkbookValue = sourceWorkbook;
  } else {
    issues.push({ path: `${path}.source_workbook`, message: "Must be a non-empty string" });
  }

  let recordCountValue: number | null = null;
  if (typeof recordCount === "number" && Number.isInteger(recordCount) && recordCount >= 0) {
    recordCountValue = recordCount;
  } else {
    issues.push({ path: `${path}.record_count`, message: "Must be an integer >= 0" });
  }

  let lastUpdatedValue: string | null = null;
  if (lastUpdated === null || lastUpdated === undefined) {
    lastUpdatedValue = null;
  } else if (typeof lastUpdated === "string" && DATE_REGEX.test(lastUpdated)) {
    lastUpdatedValue = lastUpdated;
  } else {
    issues.push({ path: `${path}.last_updated`, message: "Must be null or YYYY-MM-DD" });
  }

  if (
    datasetValue === null ||
    generatedAtValue === null ||
    sourceWorkbookValue === null ||
    recordCountValue === null ||
    lastUpdatedValue === undefined
  ) {
    return null;
  }

  return {
    dataset: datasetValue,
    generated_at: generatedAtValue,
    source_workbook: sourceWorkbookValue,
    record_count: recordCountValue,
    last_updated: lastUpdatedValue,
  };
}

function validateInteractionRecords(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): InteractionRecord[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  const records: InteractionRecord[] = [];

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      return;
    }

    const messageId = entry.message_id;
    const participant = entry.participant;
    const messageDate = entry.message_date ?? null;
    const messageTimeFraction = entry.message_time_fraction ?? null;
    const occurredAt = entry.occurred_at ?? null;
    const dayOfWeek = entry.day_of_week ?? null;
    const category = entry.category ?? null;
    const subcategory = entry.subcategory ?? null;
    const categoryJustification = entry.category_justification ?? null;
    const satisfied = entry.satisfied ?? null;
    const satisfactionJustification = entry.satisfaction_justification ?? null;
    const registrationDate = entry.registration_date ?? null;
    const studyWeek = entry.study_week ?? null;
    const responseLatency = entry.response_latency_seconds ?? null;
    const emergencyResponse = entry.emergency_response ?? null;
    const inputCost = entry.input_cost ?? null;
    const outputCost = entry.output_cost ?? null;
    const totalCost = entry.total_cost ?? null;

    if (typeof messageId !== "string" || messageId.trim().length === 0) {
      issues.push({ path: `${entryPath}.message_id`, message: "Must be a non-empty string" });
    }

    if (typeof participant !== "string" || participant.trim().length === 0) {
      issues.push({ path: `${entryPath}.participant`, message: "Must be a non-empty string" });
    }

    if (messageDate !== null && (typeof messageDate !== "string" || !DATE_REGEX.test(messageDate))) {
      issues.push({ path: `${entryPath}.message_date`, message: "Must be null or YYYY-MM-DD" });
    }

    if (
      messageTimeFraction !== null &&
      (typeof messageTimeFraction !== "number" || messageTimeFraction < 0 || messageTimeFraction > 1)
    ) {
      issues.push({
        path: `${entryPath}.message_time_fraction`,
        message: "Must be null or a number between 0 and 1",
      });
    }

    if (occurredAt !== null && typeof occurredAt !== "string") {
      issues.push({ path: `${entryPath}.occurred_at`, message: "Must be null or an ISO timestamp string" });
    }

    if (dayOfWeek !== null && typeof dayOfWeek !== "string") {
      issues.push({ path: `${entryPath}.day_of_week`, message: "Must be null or a weekday string" });
    }

    if (category !== null && typeof category !== "string") {
      issues.push({ path: `${entryPath}.category`, message: "Must be null or a string" });
    }

    if (subcategory !== null && typeof subcategory !== "string") {
      issues.push({ path: `${entryPath}.subcategory`, message: "Must be null or a string" });
    }

    if (categoryJustification !== null && typeof categoryJustification !== "string") {
      issues.push({
        path: `${entryPath}.category_justification`,
        message: "Must be null or a string",
      });
    }

    if (satisfied !== null && typeof satisfied !== "boolean") {
      issues.push({ path: `${entryPath}.satisfied`, message: "Must be null or a boolean" });
    }

    if (satisfactionJustification !== null && typeof satisfactionJustification !== "string") {
      issues.push({
        path: `${entryPath}.satisfaction_justification`,
        message: "Must be null or a string",
      });
    }

    if (registrationDate !== null && (typeof registrationDate !== "string" || !DATE_REGEX.test(registrationDate))) {
      issues.push({
        path: `${entryPath}.registration_date`,
        message: "Must be null or YYYY-MM-DD",
      });
    }

    if (
      studyWeek !== null &&
      (typeof studyWeek !== "number" || !Number.isInteger(studyWeek) || studyWeek < 1)
    ) {
      issues.push({
        path: `${entryPath}.study_week`,
        message: "Must be null or an integer >= 1",
      });
    }

    if (
      responseLatency !== null &&
      (typeof responseLatency !== "number" || responseLatency < 0)
    ) {
      issues.push({
        path: `${entryPath}.response_latency_seconds`,
        message: "Must be null or a non-negative number",
      });
    }

    if (emergencyResponse !== null && typeof emergencyResponse !== "boolean") {
      issues.push({
        path: `${entryPath}.emergency_response`,
        message: "Must be null or a boolean",
      });
    }

    if (inputCost !== null && (typeof inputCost !== "number" || inputCost < 0)) {
      issues.push({ path: `${entryPath}.input_cost`, message: "Must be null or a non-negative number" });
    }

    if (outputCost !== null && (typeof outputCost !== "number" || outputCost < 0)) {
      issues.push({ path: `${entryPath}.output_cost`, message: "Must be null or a non-negative number" });
    }

    if (totalCost !== null && (typeof totalCost !== "number" || totalCost < 0)) {
      issues.push({ path: `${entryPath}.total_cost`, message: "Must be null or a non-negative number" });
    }

    records.push({
      message_id: typeof messageId === "string" ? messageId : "",
      participant: typeof participant === "string" ? participant : "",
      message_date: typeof messageDate === "string" ? messageDate : null,
      message_time_fraction: typeof messageTimeFraction === "number" ? messageTimeFraction : null,
      occurred_at: typeof occurredAt === "string" ? occurredAt : null,
      day_of_week: typeof dayOfWeek === "string" ? dayOfWeek : null,
      category: typeof category === "string" ? category : null,
      subcategory: typeof subcategory === "string" ? subcategory : null,
      category_justification: typeof categoryJustification === "string" ? categoryJustification : null,
      satisfied: typeof satisfied === "boolean" ? satisfied : null,
      satisfaction_justification: typeof satisfactionJustification === "string" ? satisfactionJustification : null,
      registration_date: typeof registrationDate === "string" ? registrationDate : null,
      study_week: typeof studyWeek === "number" ? studyWeek : null,
      response_latency_seconds: typeof responseLatency === "number" ? responseLatency : null,
      emergency_response: typeof emergencyResponse === "boolean" ? emergencyResponse : null,
      input_cost: typeof inputCost === "number" ? inputCost : null,
      output_cost: typeof outputCost === "number" ? outputCost : null,
      total_cost: typeof totalCost === "number" ? totalCost : null,
    });
  });

  if (issues.length > 0) {
    return null;
  }

  return records;
}

function validateParticipantSummaries(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ParticipantSummary[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array" });
    return null;
  }

  const summaries: ParticipantSummary[] = [];

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object" });
      return;
    }

    const participant = entry.participant;
    const messageCount = entry.message_count;
    const firstMessageAt = entry.first_message_at ?? null;
    const lastMessageAt = entry.last_message_at ?? null;
    const totalInputCost = entry.total_input_cost;
    const totalOutputCost = entry.total_output_cost;
    const totalCost = entry.total_cost;

    if (typeof participant !== "string" || participant.trim().length === 0) {
      issues.push({ path: `${entryPath}.participant`, message: "Must be a non-empty string" });
    }

    if (typeof messageCount !== "number") {
      issues.push({ path: `${entryPath}.message_count`, message: "Must be a number" });
    } else if (!Number.isInteger(messageCount) || messageCount < 0) {
      issues.push({ path: `${entryPath}.message_count`, message: "Must be an integer >= 0" });
    }

    if (firstMessageAt !== null && typeof firstMessageAt !== "string") {
      issues.push({ path: `${entryPath}.first_message_at`, message: "Must be null or string" });
    }

    if (lastMessageAt !== null && typeof lastMessageAt !== "string") {
      issues.push({ path: `${entryPath}.last_message_at`, message: "Must be null or string" });
    }

    if (typeof totalInputCost !== "number" || totalInputCost < 0) {
      issues.push({ path: `${entryPath}.total_input_cost`, message: "Must be a non-negative number" });
    }

    if (typeof totalOutputCost !== "number" || totalOutputCost < 0) {
      issues.push({ path: `${entryPath}.total_output_cost`, message: "Must be a non-negative number" });
    }

    if (typeof totalCost !== "number" || totalCost < 0) {
      issues.push({ path: `${entryPath}.total_cost`, message: "Must be a non-negative number" });
    }

    summaries.push({
      participant: typeof participant === "string" ? participant : "",
      message_count:
        typeof messageCount === "number" && Number.isInteger(messageCount) && messageCount >= 0 ? messageCount : 0,
      first_message_at: typeof firstMessageAt === "string" ? firstMessageAt : null,
      last_message_at: typeof lastMessageAt === "string" ? lastMessageAt : null,
      total_input_cost: typeof totalInputCost === "number" ? totalInputCost : 0,
      total_output_cost: typeof totalOutputCost === "number" ? totalOutputCost : 0,
      total_cost: typeof totalCost === "number" ? totalCost : 0,
    });
  });

  if (issues.length > 0) {
    return null;
  }

  return summaries;
}
