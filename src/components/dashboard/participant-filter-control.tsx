"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ParticipantFilterControl() {
  const { participantFilter } = useDashboardData();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const noop = () => {};
  const resolvedFilter =
    participantFilter ??
    {
      mode: "include" as const,
      selectedIds: [] as string[],
      isActive: false,
      options: [] as Array<{ id: string; label: string; messageCount: number }>,
      setMode: noop,
      setSelectedIds: noop,
      toggleParticipant: noop,
      clear: noop,
      isEnabled: false,
    };

  const {
    mode,
    selectedIds,
    isActive,
    options,
    setMode,
    setSelectedIds,
    toggleParticipant,
    clear,
    isEnabled,
  } = resolvedFilter;

  const allParticipantIds = useMemo(() => options.map((option) => option.id), [options]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const summaryLabel = isActive
    ? mode === "include"
      ? `${selectedIds.length} included`
      : `${selectedIds.length} excluded`
    : "All participants";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border-slate-300 px-3 text-sm font-medium text-slate-700 transition",
            "hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
            isActive ? "border-brand-300 bg-brand-50 text-brand-700" : "",
          )}
          type="button"
        >
          <Filter className="h-4 w-4" aria-hidden />
          <span>Participants</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              isActive ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600",
            )}
          >
            {summaryLabel}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Filter participants</DialogTitle>
          <DialogDescription>
            Choose which participants to include or exclude. All dashboard metrics and charts will update instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter mode</span>
            <div className="inline-flex overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setMode("include")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
                  mode === "include"
                    ? "bg-brand-600 text-white shadow-inner"
                    : "bg-white text-slate-600 hover:bg-slate-100",
                )}
              >
                Include selected
              </button>
              <button
                type="button"
                onClick={() => setMode("exclude")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring focus-visible:ring-brand-400",
                  mode === "exclude"
                    ? "bg-brand-600 text-white shadow-inner"
                    : "bg-white text-slate-600 hover:bg-slate-100",
                )}
              >
                Exclude selected
              </button>
            </div>
            <p className="text-sm text-slate-500">
              {mode === "include"
                ? "Show only the participants you pick."
                : "Hide the participants you pick and keep everyone else visible."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search participants"
                className="rounded-full border-slate-300 pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Participants
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(allParticipantIds)}
                  disabled={allParticipantIds.length === 0}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  disabled={!isActive}
                >
                  Clear all
                </Button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No participants match “{searchQuery}”.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredOptions.map((option) => {
                    const checked = selectedIds.includes(option.id);
                    return (
                      <li key={option.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(option.id)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="flex flex-1 items-center justify-between">
                            <span className="font-medium text-slate-700">{option.label}</span>
                            <span className="text-sm text-slate-500">{option.messageCount.toLocaleString()} msgs</span>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {isActive
                ? mode === "include"
                  ? `${selectedIds.length} participant${selectedIds.length === 1 ? "" : "s"} included`
                  : `${selectedIds.length} participant${selectedIds.length === 1 ? "" : "s"} excluded`
                : "No participant filter applied"}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
