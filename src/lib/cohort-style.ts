import type { CohortBadgeTone } from "@/components/dashboard/dashboard-data-provider";

export function getCohortToneClasses(tone: CohortBadgeTone): { badge: string; dot: string } {
  switch (tone) {
    case "include":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "exclude":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    default:
      return {
        badge: "border-brand-200 bg-brand-50 text-brand-700",
        dot: "bg-brand-400",
      };
  }
}
