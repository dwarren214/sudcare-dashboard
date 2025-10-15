import {
  DatasetKey,
  DashboardData,
  DashboardDataValidationError,
  NormalizedDashboardDataset,
  NormalizedDashboardValidationError,
  parseDashboardData,
  parseNormalizedDashboardDataset,
} from "../../types/dashboard";
import allDatasetPayload from "../../data/data-all.json";
import excludeP266DatasetPayload from "../../data/data-exclude-p266.json";
import { buildDashboardDataFromNormalizedDataset } from "./dashboard-aggregator";

const DATASET_FILE_MAP: Record<DatasetKey, string> = {
  all: "data-all.json",
  exclude_p266: "data-exclude-p266.json",
};

export type DataSource = "filesystem" | "api" | "bundle";

export interface DatasetLoadMeta {
  dataset: DatasetKey;
  source: DataSource;
  sourcePath?: string;
  loadedAt: string;
}

export interface DatasetLoadResult {
  data: DashboardData;
  meta: DatasetLoadMeta;
  normalized: NormalizedDashboardDataset | null;
}

interface ParsedDataset {
  dashboard: DashboardData;
  normalized: NormalizedDashboardDataset | null;
}

interface DatasetLoadErrorInit {
  readonly cause?: unknown;
  readonly userMessage?: string;
  readonly source: DataSource;
}

export class DatasetLoadError extends Error {
  public readonly dataset: DatasetKey;
  public readonly userMessage: string;
  public readonly source: DataSource;

  constructor(dataset: DatasetKey, message: string, options: DatasetLoadErrorInit) {
    super(message);
    this.name = "DatasetLoadError";
    this.dataset = dataset;
    this.source = options.source;
    this.userMessage = options.userMessage ??
      "Dashboard data is unavailable. Run `npm run seed-data` and try again.";
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatasetLoadError);
    }
  }
}

export async function getAllDataset(): Promise<DatasetLoadResult> {
  return loadDataset("all");
}

export async function getExcludeP266Dataset(): Promise<DatasetLoadResult> {
  return loadDataset("exclude_p266");
}

export async function loadDataset(dataset: DatasetKey): Promise<DatasetLoadResult> {
  if (isServer()) {
    return loadDatasetFromFilesystem(dataset);
  }

  return loadDatasetFromApi(dataset);
}

function isServer(): boolean {
  return typeof window === "undefined";
}

async function loadDatasetFromFilesystem(dataset: DatasetKey): Promise<DatasetLoadResult> {
  const fileName = DATASET_FILE_MAP[dataset];
  const { join } = await getPathModule();
  const absolutePath = join(process.cwd(), "data", fileName);
  const bundled = getBundledDataset(dataset);

  let payload: unknown = null;
  try {
    const { readFile } = await getFsModule();
    const rawContents = await readFile(absolutePath, "utf-8");
    payload = JSON.parse(rawContents);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT" && bundled) {
      logBundledFallback(dataset, absolutePath);
      return buildBundledDatasetResult(dataset, bundled);
    }

    handleFilesystemError(dataset, absolutePath, error);
  }

  const parsed = parseDatasetPayload(dataset, payload, "filesystem");

  return {
    data: parsed.dashboard,
    normalized: parsed.normalized,
    meta: {
      dataset,
      source: "filesystem",
      sourcePath: absolutePath,
      loadedAt: new Date().toISOString(),
    },
  };
}

async function loadDatasetFromApi(dataset: DatasetKey): Promise<DatasetLoadResult> {
  const response = await fetch(`/api/dashboard-data/${dataset}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DatasetLoadError(dataset, `API returned ${response.status} while loading dataset`, {
      source: "api",
      userMessage: "Unable to fetch dashboard data. Refresh or contact an administrator.",
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (error) {
    throw new DatasetLoadError(dataset, "Failed to parse JSON response from data API", {
      source: "api",
      cause: error,
    });
  }

  const parsed = parseDatasetPayload(dataset, payload, "api");

  return {
    data: parsed.dashboard,
    normalized: parsed.normalized,
    meta: {
      dataset,
      source: "api",
      loadedAt: new Date().toISOString(),
    },
  };
}

function handleFilesystemError(dataset: DatasetKey, absolutePath: string, error: unknown): never {
  const nodeError = error as NodeJS.ErrnoException;

  if (nodeError?.code === "ENOENT") {
    logMissingFile(dataset, absolutePath);
    throw new DatasetLoadError(dataset, `Dataset file not found at ${absolutePath}`, {
      source: "filesystem",
      cause: error,
      userMessage: `Dataset "${dataset}" is missing. Run \`npm run seed-data\` to provision JSON fixtures.`,
    });
  }

  throw new DatasetLoadError(dataset, `Unable to read dataset file at ${absolutePath}`, {
    source: "filesystem",
    cause: error,
  });
}

function logMissingFile(dataset: DatasetKey, absolutePath: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[data-repository] Missing ${dataset} dataset at ${absolutePath}. Run \`npm run seed-data\` to create sample data.`,
    );
  }
}

function parseDatasetPayload(dataset: DatasetKey, payload: unknown, source: DataSource): ParsedDataset {
  let legacyError: DashboardDataValidationError | null = null;

  try {
    const dashboard = parseDashboardData(payload);
    return { dashboard, normalized: null };
  } catch (error) {
    if (error instanceof DashboardDataValidationError) {
      legacyError = error;
    } else {
      throw new DatasetLoadError(dataset, "Loaded dataset failed validation", {
        source,
        cause: error,
        userMessage: `Dashboard data for "${dataset}" is invalid. Check JSON structure and rerun \`npm run seed-data\`.`,
      });
    }
  }

  try {
    const normalized = parseNormalizedDashboardDataset(payload);
    const aggregation = buildDashboardDataFromNormalizedDataset(normalized, {
      datasetKey: dataset,
      fallbackLastUpdated: new Date().toISOString().slice(0, 10),
    });
    return { dashboard: aggregation.dashboard, normalized };
  } catch (error) {
    const normalizedError = error instanceof NormalizedDashboardValidationError ? error : null;
    const combinedIssues = [
      ...(legacyError?.issues ?? []),
      ...(normalizedError?.issues ?? []),
    ];

    const message = combinedIssues.length > 0
      ? `Loaded dataset failed validation: ${combinedIssues[0]?.path} — ${combinedIssues[0]?.message}`
      : "Loaded dataset failed validation";

    throw new DatasetLoadError(dataset, message, {
      source,
      cause: error,
      userMessage: `Dashboard data for "${dataset}" is invalid. Check JSON structure and rerun \`npm run seed-data\`.`,
    });
  }
}

const BUNDLED_DATASET_PAYLOADS: Record<DatasetKey, unknown> = {
  all: allDatasetPayload,
  exclude_p266: excludeP266DatasetPayload,
};

const BUNDLED_DATASETS: Record<DatasetKey, ParsedDataset> = {
  all: parseDatasetPayload("all", BUNDLED_DATASET_PAYLOADS.all, "bundle"),
  exclude_p266: parseDatasetPayload("exclude_p266", BUNDLED_DATASET_PAYLOADS.exclude_p266, "bundle"),
};

function getBundledDataset(dataset: DatasetKey): ParsedDataset | null {
  return BUNDLED_DATASETS[dataset] ?? null;
}

function buildBundledDatasetResult(dataset: DatasetKey, parsed: ParsedDataset): DatasetLoadResult {
  return {
    data: cloneDataset(parsed.dashboard),
    normalized: cloneNormalizedDataset(parsed.normalized),
    meta: {
      dataset,
      source: "bundle",
      sourcePath: `bundle:${DATASET_FILE_MAP[dataset]}`,
      loadedAt: new Date().toISOString(),
    },
  };
}

function cloneDataset(data: DashboardData): DashboardData {
  const structuredCloneFn = (globalThis as { structuredClone?: unknown }).structuredClone;

  if (typeof structuredCloneFn === "function") {
    return (structuredCloneFn as <T>(value: T) => T)(data);
  }

  return JSON.parse(JSON.stringify(data)) as DashboardData;
}

function cloneNormalizedDataset(data: NormalizedDashboardDataset | null): NormalizedDashboardDataset | null {
  if (!data) {
    return null;
  }

  return JSON.parse(JSON.stringify(data)) as NormalizedDashboardDataset;
}

function logBundledFallback(dataset: DatasetKey, absolutePath: string) {
  const message = `[data-repository] Falling back to bundled dataset for "${dataset}" (expected at ${absolutePath}).`;

  if (process.env.NODE_ENV === "production") {
    console.error(message);
  } else {
    console.warn(message);
  }
}

let fsModule: typeof import("node:fs/promises") | null = null;
async function getFsModule() {
  if (!fsModule) {
    fsModule = await import(/* webpackIgnore: true */ "node:fs/promises");
  }
  return fsModule;
}

let pathModule: typeof import("node:path") | null = null;
async function getPathModule() {
  if (!pathModule) {
    pathModule = await import(/* webpackIgnore: true */ "node:path");
  }
  return pathModule;
}
