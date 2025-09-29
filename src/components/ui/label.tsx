"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium text-slate-700",
          className,
        )}
        {...props}
      >
        <span className="flex items-center gap-1">
          {children}
          {required ? <span className="text-sm text-danger">*</span> : null}
        </span>
      </label>
    );
  },
);
Label.displayName = "Label";
