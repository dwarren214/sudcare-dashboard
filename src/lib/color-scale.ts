const CATEGORY_COLORS = [
  "#2e82f6",
  "#124cb0",
  "#f97316",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#facc15",
  "#ef4444",
  "#0ea5e9",
  "#c084fc",
  "#fb7185",
];

export type CategoryColorMap = Record<string, string>;

export function createCategoryColorMap(names: string[]): CategoryColorMap {
  const uniqueNames = Array.from(new Set(names));
  const map: CategoryColorMap = {};

  uniqueNames.forEach((name, index) => {
    const paletteIndex = index % CATEGORY_COLORS.length;
    map[name] = CATEGORY_COLORS[paletteIndex];
  });

  return map;
}

export function getCategoryColor(name: string, map: CategoryColorMap, fallbackIndex = 0): string {
  if (map[name]) {
    return map[name];
  }

  const paletteIndex = Math.abs(fallbackIndex) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[paletteIndex];
}

export const categoryPalette = CATEGORY_COLORS;
