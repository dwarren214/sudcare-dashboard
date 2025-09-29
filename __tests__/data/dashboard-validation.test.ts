import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardDataValidationError,
  parseDashboardData,
  validateDashboardData,
} from "../../types/dashboard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "fixtures");

function loadFixture(name: string) {
  const filePath = path.resolve(fixturesDir, name);
  const contents = readFileSync(filePath, "utf-8");
  return JSON.parse(contents);
}

describe("dashboard data validation", () => {
  it("passes validation for a conforming payload", () => {
    const payload = loadFixture("valid-dashboard.json");
    const result = validateDashboardData(payload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataset).toBe("all");
      expect(result.data.metrics.weekly_messages[0].week).toBe(1);
    }
  });

  it("aggregates issues for an invalid payload", () => {
    const payload = loadFixture("invalid-dashboard.json");
    const result = validateDashboardData(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.issues.map((issue) => issue.path);
      expect(paths).toContain("dataset");
      expect(paths).toContain("metrics.weekly_messages[0].week");
    }
  });

  it("throws with console diagnostics when parsing invalid payloads", () => {
    const payload = loadFixture("invalid-dashboard.json");
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => parseDashboardData(payload)).toThrow(DashboardDataValidationError);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
