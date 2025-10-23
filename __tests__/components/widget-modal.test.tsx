import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/export-image", () => ({
  exportElementToPng: vi.fn(),
}));

vi.mock("@/lib/downloads", () => ({
  downloadBlob: vi.fn(),
  downloadText: vi.fn(),
}));

import { WidgetModal } from "@/components/dashboard/widget-modal";
import { exportElementToPng } from "@/lib/export-image";
import { downloadBlob, downloadText } from "@/lib/downloads";

describe("WidgetModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_EXPORTS = "true";
  });

  it("renders fallback export placeholder when no export config is provided", () => {
    const handleOpenChange = vi.fn();

    render(
      <WidgetModal
        open
        onOpenChange={handleOpenChange}
        title="Messages by Study Week"
        description="Expanded view of weekly message volume."
        cohortLabel="All participants"
        cohortDescription="Includes every participant in the study."
        cohortTone="all"
        lastUpdated="2025-01-15"
        loadedAt="2025-01-16T12:00:00.000Z"
      >
        <div data-testid="chart">Chart content</div>
      </WidgetModal>,
    );

    expect(screen.getByRole("dialog", { name: "Messages by Study Week" })).toBeInTheDocument();
    expect(screen.getByText("All participants")).toBeInTheDocument();
    expect(screen.getByText("Exports unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exports disabled" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Close/));
    expect(handleOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("downloads snapshot and CSV when export controls are triggered", async () => {
    const blob = new Blob(["png"]);
    vi.mocked(exportElementToPng).mockResolvedValue(blob);
    const buildCsv = vi.fn().mockResolvedValue("Column A,Column B\r\nOne,Two");

    render(
      <WidgetModal
        open
        onOpenChange={vi.fn()}
        title="Messages by Study Week"
        cohortLabel="All participants"
        cohortTone="all"
        exportConfig={{
          widgetKey: "weekly-messages",
          dataset: "all",
          cohortMode: "all",
          selectedParticipantIds: [],
          buildCsv,
        }}
      >
        <div>Chart content</div>
      </WidgetModal>,
    );

    const snapshotButton = screen.getByRole("button", { name: "Download snapshot" });
    fireEvent.click(snapshotButton);

    await waitFor(() => {
      expect(exportElementToPng).toHaveBeenCalledTimes(1);
      expect(downloadBlob).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Snapshot downloaded.")).toBeInTheDocument();
    });

    const csvButton = screen.getByRole("button", { name: "Download CSV" });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(buildCsv).toHaveBeenCalledTimes(1);
      expect(downloadText).toHaveBeenCalledTimes(1);
    });

    const [[csvContent, csvFilename, mimeType]] = vi.mocked(downloadText).mock.calls;
    expect(csvFilename).toMatch(/weekly-messages_/);
    expect(mimeType).toBe("text/csv;charset=utf-8");
    expect(csvContent.startsWith("\uFEFFColumn A,Column B")).toBe(true);
  });
});
