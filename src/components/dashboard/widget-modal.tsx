"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  datasetLabel: string;
  datasetDescription?: string;
  lastUpdated?: string;
  loadedAt?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  insights?: ReactNode;
}

export function WidgetModal({
  open,
  onOpenChange,
  title,
  description,
  datasetLabel,
  datasetDescription,
  lastUpdated,
  loadedAt,
  children,
  footer,
  insights,
}: WidgetModalProps) {
  const timestampLabel = buildTimestampLabel({ lastUpdated, loadedAt });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] w-full max-w-5xl overflow-hidden border-none bg-white p-0 shadow-2xl",
        )}
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-3 border-b border-slate-200 bg-white px-6 py-5 text-left">
            <DialogTitle className="text-2xl font-semibold text-slate-900">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-brand-100 px-3 py-1 font-medium text-brand-700">
                {datasetLabel}
              </span>
              {timestampLabel ? <span className="text-slate-400">{timestampLabel}</span> : null}
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            {datasetDescription ? (
              <p className="max-w-3xl text-sm text-slate-500">{datasetDescription}</p>
            ) : null}

            {insights ? <div className="text-sm text-slate-600">{insights}</div> : null}

            <motion.div
              initial={{ opacity: 0.7, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner"
            >
              {children}
            </motion.div>

            {footer ?? (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-700">Download snapshot coming soon</p>
                  <p className="text-xs text-slate-400">
                    Export controls will let you share this expanded view in a future release.
                  </p>
                </div>
                <Button variant="outline" disabled className="border-dashed">
                  Download snapshot
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildTimestampLabel({
  lastUpdated,
  loadedAt,
}: {
  lastUpdated?: string;
  loadedAt?: string | null;
}): string | null {
  if (loadedAt) {
    const loadedDate = safeDate(loadedAt);
    if (loadedDate) {
      return `Loaded ${new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(loadedDate)}`;
    }
  }

  if (lastUpdated) {
    const updatedDate = safeDate(lastUpdated);
    if (updatedDate) {
      return `Last updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(updatedDate)}`;
    }
  }

  if (lastUpdated) {
    return `Last updated ${lastUpdated}`;
  }

  return null;
}

function safeDate(input: string): Date | null {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}
