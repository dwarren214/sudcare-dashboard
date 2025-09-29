import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { WidgetModal } from "@/components/dashboard/widget-modal";

describe("WidgetModal", () => {
  it("renders dataset metadata, children, and snapshot placeholder", () => {
    const handleOpenChange = vi.fn();

    render(
      <WidgetModal
        open
        onOpenChange={handleOpenChange}
        title="Messages by Week"
        description="Expanded view of weekly message volume."
        datasetLabel="All participants"
        datasetDescription="Includes every participant in the study."
        lastUpdated="2025-01-15"
        loadedAt="2025-01-16T12:00:00.000Z"
      >
        <div data-testid="chart">Chart content</div>
      </WidgetModal>,
    );

    expect(screen.getByRole("dialog", { name: "Messages by Week" })).toBeInTheDocument();
    expect(screen.getByText("All participants")).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();

    const downloadButton = screen.getByRole("button", { name: /Download snapshot/ });
    expect(downloadButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Close/));
    expect(handleOpenChange).toHaveBeenLastCalledWith(false);
  });
});
