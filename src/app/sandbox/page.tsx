"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WeeklyMessagesChart } from "@/components/dashboard/widgets/weekly-messages-chart";
import { MessagesByUserChart } from "@/components/dashboard/widgets/messages-by-user-chart";
import { CategoriesChart } from "@/components/dashboard/widgets/categories-chart";
import { SubcategoriesChart } from "@/components/dashboard/widgets/subcategories-chart";
import { AssistantResponseChart } from "@/components/dashboard/widgets/assistant-response-chart";
import { MessageTimesHeatmap } from "@/components/dashboard/widgets/message-times-heatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  assistantResponses,
  categories,
  messageTimes,
  participants,
  subcategories,
  weeklyMessages,
} from "@/lib/mock-data";

const TOOLBAR_OPTIONS = [
  { id: "all", label: "All participants" },
  { id: "exclude_p266", label: "Exclude p266" },
];

export default function SandboxPage() {
  const [dataset, setDataset] = useState("all");

  return (
    <AppShell
      toolbar={
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <Card className="w-full md:w-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Live preview of form controls.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="search" required>
                  Search participants
                </Label>
                <Input id="search" placeholder="Search by ID" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Dataset</Label>
                <Select value={dataset} onValueChange={(value) => setDataset(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLBAR_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="motion">Animations</Label>
                <Switch id="motion" defaultChecked />
              </div>
            </CardContent>
          </Card>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="md:self-start">Preview dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sample shadcn Dialog</DialogTitle>
                <DialogDescription>Use this modal scaffold when building widget detail views.</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-slate-600">
                This sandbox page ensures our core UI primitives render correctly before integrating them into
                widgets.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">UI Sandbox</h2>
        <p className="text-sm text-slate-500">
          Early preview of Tailwind theme tokens and shadcn components.
        </p>
      </div>
      <DashboardGrid>
        <WidgetCard
          title="Weekly messages"
          description="Grid preview of Story 2 chart"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <WeeklyMessagesChart data={weeklyMessages} />
        </WidgetCard>
        <WidgetCard
          title="Loading state"
          description="Use when metrics request is in-flight"
          datasetLabel="All participants"
        >
          <WidgetCard.Loading description="Pretend fetch underway" />
        </WidgetCard>
        <WidgetCard
          title="Empty state"
          description="Render when data array is empty"
          datasetLabel="All participants"
        >
          <WidgetCard.Empty action={<Button size="sm">Review dataset</Button>} />
        </WidgetCard>
        <WidgetCard
          title="Error state"
          description="Use for load failures"
          datasetLabel="All participants"
        >
          <WidgetCard.Error
            action={
              <Button size="sm" variant="outline">
                Retry
              </Button>
            }
            description="Sample error copy to guide remediation."
          />
        </WidgetCard>
        <WidgetCard
          title="Messages by user"
          description="Collapsed preview — top five"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <MessagesByUserChart data={participants} collapsedLimit={5} />
        </WidgetCard>
        <WidgetCard
          title="Messages by user (expanded)"
          description="Shows full participant list"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <MessagesByUserChart data={participants} isExpanded collapsedLimit={5} />
        </WidgetCard>
        <WidgetCard
          title="Interaction Fulfillment"
          description="Percentage of user intents the assistant answered successfully"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <AssistantResponseChart data={assistantResponses} />
        </WidgetCard>
        <WidgetCard
          title="Categories"
          description="Collapsed view"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <CategoriesChart data={categories} />
        </WidgetCard>
        <WidgetCard
          title="Subcategories"
          description="Expanded view"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <SubcategoriesChart data={subcategories} isExpanded />
        </WidgetCard>
        <WidgetCard
          title="Message times"
          description="Heatmap preview"
          datasetLabel={dataset === "all" ? "All participants" : "Exclude p266"}
        >
          <MessageTimesHeatmap data={messageTimes} />
        </WidgetCard>
      </DashboardGrid>
    </AppShell>
  );
}
