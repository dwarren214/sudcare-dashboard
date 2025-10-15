import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseNormalizedDashboardDataset } from "../../types/dashboard";

describe("ingest_dashboard_data.py", () => {
  const scriptPath = "scripts/ingest_dashboard_data.py";
  const workbookPath = "docs/SUDCare Dashboard v0 Dataset.xlsx";

  test("generates normalized datasets for all and excluded participants", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "ingest-output-"));

    try {
      execFileSync(
        "python3",
        [
          scriptPath,
          "--source",
          workbookPath,
          "--output",
          outputDir,
          "--exclude",
          "p266",
          "--dataset-prefix",
          "test_dataset",
        ],
        {
          stdio: "inherit",
        },
      );

      const allDatasetRaw = readFileSync(join(outputDir, "test_dataset_all.json"), "utf-8");
      const excludeDatasetRaw = readFileSync(join(outputDir, "test_dataset_exclude.json"), "utf-8");

      const allDataset = parseNormalizedDashboardDataset(JSON.parse(allDatasetRaw));
      const excludeDataset = parseNormalizedDashboardDataset(JSON.parse(excludeDatasetRaw));

      expect(allDataset.meta.record_count).toBeGreaterThan(0);
      expect(allDataset.interactions.some((entry) => entry.participant === "p266")).toBe(true);

      expect(excludeDataset.meta.record_count).toBeGreaterThan(0);
      expect(excludeDataset.interactions.some((entry) => entry.participant === "p266")).toBe(false);
      expect(excludeDataset.meta.record_count).toBeLessThan(allDataset.meta.record_count);
      expect(excludeDataset.participants.every((participant) => participant.participant !== "p266")).toBe(true);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
