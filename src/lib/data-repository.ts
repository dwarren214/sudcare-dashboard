import { DatasetKey, DashboardData, parseDashboardData } from "../../types/dashboard";

const DATASET_FILE_MAP: Record<DatasetKey, string> = {
  all: "data-all.json",
  exclude_p266: "data-exclude-p266.json",
};

export type DataSource = "filesystem" | "api";

export interface DatasetLoadMeta {
  dataset: DatasetKey;
  source: DataSource;
  sourcePath?: string;
  loadedAt: string;
}

export interface DatasetLoadResult {
  data: DashboardData;
  meta: DatasetLoadMeta;
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

  let payload: unknown = null;
  try {
    const { readFile } = await getFsModule();
    const rawContents = await readFile(absolutePath, "utf-8");
    payload = JSON.parse(rawContents);
  } catch (error) {
    handleFilesystemError(dataset, absolutePath, error);
  }

  const data = parseSafely(dataset, payload, "filesystem");

  return {
    data,
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

  const data = parseSafely(dataset, payload, "api");

  return {
    data,
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

function parseSafely(dataset: DatasetKey, payload: unknown, source: DataSource): DashboardData {
  try {
    return parseDashboardData(payload);
  } catch (error) {
    throw new DatasetLoadError(dataset, "Loaded dataset failed validation", {
      source,
      cause: error,
      userMessage: `Dashboard data for "${dataset}" is invalid. Check JSON structure and rerun \`npm run seed-data\`.`,
    });
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
