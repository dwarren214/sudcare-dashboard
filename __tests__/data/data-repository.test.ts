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
    expect(result.normalized).toBeNull();
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

  it("supports normalized dataset payloads", async () => {
    const normalizedPayload = {
      meta: {
        dataset: "all",
        generated_at: "2025-01-01T12:00:00Z",
        source_workbook: "docs/source.xlsx",
        record_count: 1,
        last_updated: null,
      },
      interactions: [
        {
          message_id: "1",
          participant: "p100",
          message_date: "2025-01-01",
          message_time_fraction: 0.5,
          occurred_at: "2025-01-01T12:00:00",
          day_of_week: "Wednesday",
          category: "wellness",
          subcategory: "support",
          category_justification: null,
          satisfied: true,
          satisfaction_justification: null,
          registration_date: "2024-12-20",
          study_week: 1,
          response_latency_seconds: 15,
          emergency_response: false,
          input_cost: 0.1,
          output_cost: 0.1,
          total_cost: 0.2,
        },
      ],
      participants: [
        {
          participant: "p100",
          message_count: 1,
          first_message_at: "2025-01-01T12:00:00",
          last_message_at: "2025-01-01T12:00:00",
          total_input_cost: 0.1,
          total_output_cost: 0.1,
          total_cost: 0.2,
        },
      ],
    };

    const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValueOnce(JSON.stringify(normalizedPayload));

    const result = await getAllDataset();

    expect(result.normalized).not.toBeNull();
    expect(result.data.dataset).toBe("all");
    expect(result.data.metrics.messages_by_user).toEqual([{ participant: "p100", count: 1 }]);
    expect(result.data.metrics.suzy_can_respond).toEqual([
      { able: "TRUE", count: 1 },
      { able: "FALSE", count: 0 },
    ]);

    readFileSpy.mockRestore();
  });

  it("wraps validation failures with dataset context", async () => {
    const invalidJson = JSON.stringify({ dataset: "all" });
    const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(invalidJson);

    await expect(getAllDataset()).rejects.toBeInstanceOf(DatasetLoadError);

    readFileSpy.mockRestore();
  });
});
