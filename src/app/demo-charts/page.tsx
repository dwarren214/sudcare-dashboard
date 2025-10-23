"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { ChartCard } from "@/components/charts/chart-card";
import { WeeklyMessagesChart } from "@/components/charts/weekly-messages-chart";
import { MessagesByUserChart } from "@/components/charts/messages-by-user-chart";
import { AssistantResponseChart } from "@/components/charts/assistant-response-chart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { assistantResponses, participants, weeklyMessages } from "@/lib/mock-data";

const OUTLIER_ID = "p266";

export default function DemoChartsPage() {
  const [excludeOutlier, setExcludeOutlier] = useState(false);

  const participantData = useMemo(() => {
    if (!excludeOutlier) {
      return participants;
    }
    return participants.filter((participant) => participant.participant !== OUTLIER_ID);
  }, [excludeOutlier]);

  return (
    <AppShell
      toolbar={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
            <Switch
              id="dataset-toggle"
              checked={excludeOutlier}
              onCheckedChange={setExcludeOutlier}
            />
            <div className="flex flex-col">
              <Label htmlFor="dataset-toggle" className="text-slate-700">
                Toggle dataset
              </Label>
              <span className="text-xs text-slate-500">
                {excludeOutlier ? "Excluding outlier participant p266" : "Showing all participants"}
              </span>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Preview expand animation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Interaction fulfillment distribution</DialogTitle>
                <DialogDescription>
                  Framer Motion animates the enlarged chart to preview future widget expansion.
                </DialogDescription>
              </DialogHeader>
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AssistantResponseChart data={assistantResponses} />
              </motion.div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Charting Sandbox</h2>
        <p className="text-sm text-slate-500">
          Recharts and Framer Motion working together with mocked data.
        </p>
      </div>

      <DashboardGrid>
        <ChartCard title="Messages by Study Week" description="Bar chart proving base integration" delay={0}>
          <WeeklyMessagesChart data={weeklyMessages} />
        </ChartCard>
        <ChartCard
          title="Messages by User"
          description={excludeOutlier ? "Outlier removed" : "All participants"}
          delay={0.1}
        >
          <MessagesByUserChart data={participantData} />
        </ChartCard>
        <ChartCard
          title="Interaction Fulfillment Rate"
          description="Percentage of user intents the assistant answered successfully"
          delay={0.2}
        >
          <AssistantResponseChart data={assistantResponses} />
          <p className="mt-4 text-xs text-slate-500">
            Use the toolbar button to view the modal animation.
          </p>
        </ChartCard>
      </DashboardGrid>
    </AppShell>
  );
}
