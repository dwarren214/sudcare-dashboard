import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

import { WidgetCard } from "@/components/dashboard/widget-card";

const BaseProps = {
  title: "Test Widget",
  description: "Widget description",
};

describe("WidgetCard states", () => {
  it("renders loading state skeleton", () => {
    const { getByText, container } = render(
      <WidgetCard {...BaseProps}>
        <WidgetCard.Loading lines={2} />
      </WidgetCard>,
    );

    expect(getByText("Loading data")).toBeTruthy();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("renders empty state message", () => {
    const { getByText } = render(
      <WidgetCard {...BaseProps}>
        <WidgetCard.Empty />
      </WidgetCard>,
    );

    expect(getByText("No data available")).toBeTruthy();
  });

  it("renders error state with custom action", () => {
    const { getByText } = render(
      <WidgetCard {...BaseProps}>
        <WidgetCard.Error action={<button type="button">Retry</button>} />
      </WidgetCard>,
    );

    expect(getByText("Unable to load metrics")).toBeTruthy();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("renders accessible description in loading state", () => {
    const { getByText } = render(
      <WidgetCard {...BaseProps}>
        <WidgetCard.Loading title="Loading" description="Fetching" />
      </WidgetCard>,
    );

    expect(getByText("Fetching")).toBeTruthy();
  });
});
