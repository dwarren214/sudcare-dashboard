import { describe, expect, it } from "vitest";

import { buildCsvDocument } from "@/lib/csv";

describe("buildCsvDocument", () => {
  it("serializes metadata and sections into CSV content", () => {
    const csv = buildCsvDocument({
      metadata: [
        { label: "Dataset", value: "all" },
        { label: "Generated at", value: "2025-10-24 12:30" },
      ],
      sections: [
        {
          title: "Summary",
          headers: ["Label", "Value"],
          rows: [
            ["Total", 10],
            ["Average", 2.5],
          ],
        },
        {
          title: "Details",
          headers: ["Name", "Count"],
          rows: [["Example, Inc.", 3]],
        },
      ],
    });

    expect(csv).toContain('"Dataset","all"');
    expect(csv).toContain('"Summary"');
    expect(csv).toContain("Total,10");
    expect(csv).toContain('"Example, Inc.",3');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
