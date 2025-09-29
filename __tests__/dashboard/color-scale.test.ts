import { describe, expect, it } from "vitest";

import { categoryPalette, createCategoryColorMap, getCategoryColor } from "@/lib/color-scale";

describe("category color scale", () => {
  it("assigns colors based on original order", () => {
    const map = createCategoryColorMap(["beta", "alpha", "gamma"]);

    expect(map.beta).toBe(categoryPalette[0]);
    expect(map.alpha).toBe(categoryPalette[1]);
    expect(map.gamma).toBe(categoryPalette[2]);
  });

  it("wraps colors when more categories than palette", () => {
    const names = Array.from({ length: categoryPalette.length + 2 }, (_, index) => `category-${index}`);
    const map = createCategoryColorMap(names);

    expect(map["category-0"]).toBe(categoryPalette[0]);
    expect(map[`category-${categoryPalette.length}`]).toBe(categoryPalette[0]);
    expect(map[`category-${categoryPalette.length + 1}`]).toBe(categoryPalette[1]);
  });

  it("uses fallback color when name is missing in map", () => {
    const map = createCategoryColorMap(["alpha"]);
    const fallback = getCategoryColor("missing", map, 3);

    expect(fallback).toBe(categoryPalette[3]);
  });
});
