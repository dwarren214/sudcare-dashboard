import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { SiteHeader } from "@/components/layout/site-header";
import type { DashboardData } from "../../types/dashboard";
import rawValidDashboard from "../data/fixtures/valid-dashboard.json";
import { loadDataset, type DatasetLoadResult } from "@/lib/data-repository";

vi.mock("@/lib/data-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data-repository")>("@/lib/data-repository");
  return {
    ...actual,
    loadDataset: vi.fn(),
  };
});

const loadDatasetMock = vi.mocked(loadDataset);

const baseFixture = rawValidDashboard as DashboardData;
const allDataset: DashboardData = {
  ...baseFixture,
  dataset: "all",
  last_updated: "2025-01-15",
};
const excludeDataset: DashboardData = {
  ...baseFixture,
  dataset: "exclude_p266",
  last_updated: "2025-02-05",
};

const initialMeta = {
  dataset: "all" as const,
  source: "filesystem" as const,
  loadedAt: "2025-01-16T12:34:56.000Z",
};

function renderHeader() {
  return render(
    <DashboardDataProvider initialDataset="all" initialResult={{ data: allDataset, meta: initialMeta }}>
      <SiteHeader />
    </DashboardDataProvider>,
  );
}

describe("SiteHeader", () => {
  beforeEach(() => {
    loadDatasetMock.mockReset();
  });

  it("renders dataset metadata from the provider", () => {
    renderHeader();

    expect(screen.getByText("All participants")).toBeInTheDocument();
    expect(screen.getByText("Includes every participant in the study")).toBeInTheDocument();

    const lastUpdated = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(allDataset.last_updated),
    );
    const loadedAt = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(initialMeta.loadedAt));

    const lastUpdatedNode = screen.getByText(/Last updated:/i);
    expect(lastUpdatedNode).toHaveTextContent(`Last updated: ${lastUpdated}`);
    expect(lastUpdatedNode).toHaveTextContent(`Loaded ${loadedAt}`);
  });

  it("disables the toggle group during loading and updates metadata after switching datasets", async () => {
    let resolveToggle: ((value: DatasetLoadResult) => void) | null = null;
    loadDatasetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToggle = resolve;
        }),
    );

    renderHeader();

    const excludeOption = screen.getByRole("radio", { name: "Exclude p266" });
    fireEvent.click(excludeOption);

    await waitFor(() => expect(loadDatasetMock).toHaveBeenCalledTimes(1));

    expect(excludeOption).toBeDisabled();
    expect(screen.getByText(/Switching dataset/)).toBeInTheDocument();

    resolveToggle?.({
      data: excludeDataset,
      meta: {
        dataset: "exclude_p266" as const,
        source: "filesystem" as const,
        loadedAt: "2025-02-05T08:00:00.000Z",
      },
    });

    await waitFor(() => expect(excludeOption).not.toBeDisabled());
    await waitFor(() => expect(screen.queryByText(/Switching dataset/)).not.toBeInTheDocument());

    expect(screen.getByText("Exclude p266")).toBeInTheDocument();
    expect(screen.getByText("Omits known outlier activity (participant p266)")).toBeInTheDocument();

    const updatedLastUpdated = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(excludeDataset.last_updated),
    );
    expect(screen.getByText(/Last updated:/i)).toHaveTextContent(`Last updated: ${updatedLastUpdated}`);

    fireEvent.keyDown(excludeOption, { key: "ArrowLeft" });

    await waitFor(() => expect(screen.getByRole("radio", { name: "All participants" })).toHaveAttribute(
      "aria-checked",
      "true",
    ));
  });
});
