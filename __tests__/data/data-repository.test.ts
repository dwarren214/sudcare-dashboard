import * as fs from "node:fs/promises";
import { describe, expect, it, vi, afterEach, beforeAll, afterAll } from "vitest";
import {
  DatasetLoadError,
  getAllDataset,
  getExcludeP266Dataset,
} from "../../src/lib/data-repository";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs/promises");
  return { ...actual };
});

describe("data repository", () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // Force repository into filesystem mode during vitest runs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = undefined;
  });

  afterAll(() => {
    // Restore jsdom globals for other test suites
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
    if (originalFetch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the all dataset from the filesystem", async () => {
    const result = await getAllDataset();

    expect(result.data.dataset).toBe("all");
    expect(result.meta.source).toBe("filesystem");
    expect(result.meta.sourcePath).toContain("data-all.json");
  });

  it("loads the exclude_p266 dataset from the filesystem", async () => {
    const result = await getExcludeP266Dataset();

    expect(result.data.dataset).toBe("exclude_p266");
    expect(result.meta.source).toBe("filesystem");
    expect(result.meta.sourcePath).toContain("data-exclude-p266.json");
  });

  it("surfaces a helpful error when the dataset file is missing", async () => {
    const enoent = Object.assign(new Error("Missing"), { code: "ENOENT" });
    const readFileSpy = vi.spyOn(fs, "readFile").mockRejectedValue(enoent);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(getAllDataset()).rejects.toMatchObject({
      dataset: "all",
      userMessage: expect.stringContaining("npm run seed-data"),
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("npm run seed-data"));

    readFileSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("wraps validation failures with dataset context", async () => {
    const invalidJson = JSON.stringify({ dataset: "all" });
    const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(invalidJson);

    await expect(getAllDataset()).rejects.toBeInstanceOf(DatasetLoadError);

    readFileSpy.mockRestore();
  });
});
