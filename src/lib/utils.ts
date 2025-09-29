import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const brandPalette = {
  brandPrimary: "#2e82f6",
  brandSecondary: "#124cb0",
  accent: "#f97316",
  success: "#22c55e",
  danger: "#ef4444",
};

