import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface DashboardGridProps extends HTMLAttributes<HTMLDivElement> {}

export function DashboardGrid({ className, ...props }: DashboardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
      {...props}
    />
  );
}
