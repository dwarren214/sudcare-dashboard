"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WeeklyMessagesChart } from "@/components/dashboard/widgets/weekly-messages-chart";
import { MessagesByUserChart } from "@/components/dashboard/widgets/messages-by-user-chart";
import { CategoriesChart } from "@/components/dashboard/widgets/categories-chart";
import { SubcategoriesChart } from "@/components/dashboard/widgets/subcategories-chart";
import { AssistantResponseWidget } from "@/components/dashboard/widgets/assistant-response-chart";
import { MessageTimesHeatmap, type MessageTimesView } from "@/components/dashboard/widgets/message-times-heatmap";
import { WidgetModal } from "@/components/dashboard/widget-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DatasetKey } from "../../../types/dashboard";
import { summarizeAssistantResponses } from "@/lib/dashboard-transforms";
import {
  trackDatasetChange,
  trackMessageTimesViewChange,
  trackWidgetClose,
  trackWidgetDwell,
  trackWidgetExpand,
} from "@/lib/analytics";

const QUICK_LINKS = [
  { href: "/sandbox", label: "UI sandbox" },
  { href: "/demo-charts", label: "Chart demos" },
] as const;

export function HomeDashboard() {
  const {
    dataset,
    data,
    interactions,
    status,
    error,
    meta,
    prefetchDataset,
    datasetOptions,
    addChangeListener,
    refreshDataset,
  } = useDashboardData();
  const [expandedWidget, setExpandedWidget] = useState<ExpandedWidgetKey | null>(null);
  const [messageTimesView, setMessageTimesView] = useState<MessageTimesView>("aggregate");
  const messageTimesToggleId = useId();

  useEffect(() => {
    const nextDataset: DatasetKey = dataset === "all" ? "exclude_p266" : "all";
    void prefetchDataset(nextDataset);
  }, [dataset, prefetchDataset]);

  const previousDatasetRef = useRef<DatasetKey | null>(dataset);
  const datasetOptionsRef = useRef(datasetOptions);

  useEffect(() => {
    datasetOptionsRef.current = datasetOptions;
  }, [datasetOptions]);

  const expandedWidgetRef = useRef<ExpandedWidgetKey | null>(null);
  useEffect(() => {
    expandedWidgetRef.current = expandedWidget;
  }, [expandedWidget]);

  const widgetOpenTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = addChangeListener((payload) => {
      if (payload.event !== "active-changed") {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- development insight for dataset toggle flow
        console.debug("[dashboard-ui] dataset toggled", payload.dataset);
      }

      const previousDataset = previousDatasetRef.current;
      const nextDataset = payload.dataset;

      if (previousDataset !== nextDataset) {
        const activeOption = datasetOptionsRef.current.find((option) => option.key === nextDataset);
        trackDatasetChange({
          previous: previousDataset,
          next: nextDataset,
          triggeredAt: new Date().toISOString(),
          lastUpdated: activeOption?.lastUpdated ?? null,
          loadedAt: payload.meta?.loadedAt ?? activeOption?.loadedAt ?? null,
        });
      }

      previousDatasetRef.current = nextDataset;
    });
    return unsubscribe;
  }, [addChangeListener]);


  const datasetOption = useMemo(
    () => datasetOptions.find((option) => option.key === dataset),
    [dataset, datasetOptions],
  );

  const datasetLabel = datasetOption?.label ?? "All participants";
  const datasetDescription = datasetOption?.description ?? "Includes every participant in the study.";
  const datasetLastUpdated = datasetOption?.lastUpdated ?? data?.last_updated ?? "--";
  const datasetLoadedAt = datasetOption?.loadedAt ?? meta?.loadedAt ?? null;

  const weeklyMessages = useMemo(() => data?.metrics.weekly_messages ?? [], [data]);
  const messagesByUser = useMemo(() => data?.metrics.messages_by_user ?? [], [data]);
  const categories = useMemo(() => data?.metrics.categories ?? [], [data]);
  const subcategories = useMemo(() => data?.metrics.subcategories ?? [], [data]);
  const assistantResponses = useMemo(() => data?.metrics.suzy_can_respond ?? [], [data]);
  const messageTimes = useMemo(() => data?.metrics.message_times ?? [], [data]);
  const messageTimesByDay = useMemo(() => data?.metrics.message_times_by_day ?? [], [data]);

  const hasWeeklyVolume = weeklyMessages.some((entry) => entry.messages > 0);
  const hasParticipantVolume = messagesByUser.some((entry) => entry.count > 0);
  const hasCategoryVolume = categories.some((entry) => entry.count > 0);
  const hasSubcategoryVolume = subcategories.some((entry) => entry.count > 0);
  const assistantSummary = useMemo(() => summarizeAssistantResponses(assistantResponses), [assistantResponses]);
  const hasAssistantVolume = assistantSummary.total > 0;
  const hasHourlyVolume = messageTimes.some((entry) => entry.count > 0);
  const hasDayOfWeekVolume = messageTimesByDay.some((entry) => entry.count > 0);
  const hasMessageTimesVolume = hasHourlyVolume || hasDayOfWeekVolume;
  const dayBreakdownAvailable = messageTimesByDay.length > 0;

  const categorySummary = useMemo(() => {
    if (!hasCategoryVolume) {
      return null;
    }
    const total = categories.reduce((acc, entry) => acc + entry.count, 0);
    if (total === 0) {
      return null;
    }
    const top = [...categories].sort((a, b) => b.count - a.count)[0];
    const share = Math.round((top.count / total) * 100);
    return { name: top.name, share };
  }, [categories, hasCategoryVolume]);

  const subcategorySummary = useMemo(() => {
    if (!hasSubcategoryVolume) {
      return null;
    }
    const total = subcategories.reduce((acc, entry) => acc + entry.count, 0);
    if (total === 0) {
      return null;
    }
    const top = [...subcategories].sort((a, b) => b.count - a.count)[0];
    const share = Math.round((top.count / total) * 100);
    return { name: top.name, share };
  }, [hasSubcategoryVolume, subcategories]);

  const summaryMetrics = useMemo(() => {
    if (!data) {
      return [
        { label: "Messages (week)", value: "--", change: "Loading metrics" },
        { label: "Active participants", value: "--", change: "Loading metrics" },
        { label: "Intent fulfillment", value: "--", change: "Loading metrics" },
        { label: "Dataset", value: datasetLabel, change: datasetDescription },
      ];
    }

    const totalMessages = data.metrics.weekly_messages.reduce((acc, entry) => acc + entry.messages, 0);
    const activeParticipants = data.metrics.messages_by_user.length;
    const responseTrue = data.metrics.suzy_can_respond.find((entry) => entry.able === "TRUE")?.count ?? 0;
    const responseFalse = data.metrics.suzy_can_respond.find((entry) => entry.able === "FALSE")?.count ?? 0;
    const responseRate = responseTrue + responseFalse === 0
      ? "--"
      : `${Math.round((responseTrue / (responseTrue + responseFalse)) * 100)}%`;

    return [
      {
        label: "Messages (period)",
        value: totalMessages.toString(),
        change: `Across ${data.metrics.weekly_messages.length} weeks`,
      },
      {
        label: "Active participants",
        value: activeParticipants.toString(),
        change: "Contributing to message volume",
      },
      {
        label: "Intent fulfillment",
        value: responseRate,
        change: "Share of requests the assistant satisfied",
      },
      {
        label: "Dataset",
        value: datasetLabel,
        change: datasetLoadedAt
          ? `Loaded ${new Date(datasetLoadedAt).toLocaleString()}`
          : `Last updated ${datasetLastUpdated}`,
      },
    ];
  }, [data, datasetLabel, datasetLoadedAt, datasetLastUpdated, datasetDescription]);

  useEffect(() => {
    if (!dayBreakdownAvailable && messageTimesView === "weekday") {
      setMessageTimesView("aggregate");
    }
  }, [dayBreakdownAvailable, messageTimesView]);

  const isLoading = status === "loading" && !data;
  const isError = status === "error";
  const messageTimesToggleDisabled = isLoading || isError || !dayBreakdownAvailable;

  const expandButtonRefs = useRef<Partial<Record<ExpandedWidgetKey, HTMLButtonElement | null>>>({});

  const setExpandButtonRef = useCallback(
    (key: ExpandedWidgetKey) =>
      (node: HTMLButtonElement | null) => {
        expandButtonRefs.current[key] = node;
      },
    [],
  );
  const handleMessageTimesViewChange = useCallback(
    (nextView: MessageTimesView) => {
      setMessageTimesView((previous) => {
        if (previous === nextView) {
          return previous;
        }

        trackMessageTimesViewChange({
          dataset,
          previous,
          next: nextView,
          triggeredAt: new Date().toISOString(),
        });

        return nextView;
      });
    },
    [dataset],
  );

  const openWidgetModal = useCallback(
    (key: ExpandedWidgetKey) => {
      if (expandedWidgetRef.current === key) {
        return;
      }

      widgetOpenTimestampRef.current = Date.now();
      trackWidgetExpand({
        widget: key,
        triggeredAt: new Date().toISOString(),
        dataset,
      });
      setExpandedWidget(key);
    },
    [dataset],
  );

  const closeExpandedWidget = useCallback(
    (shouldRefocus = true) => {
      const key = expandedWidgetRef.current;
      if (!key) {
        return null;
      }

      const basePayload = {
        widget: key,
        triggeredAt: new Date().toISOString(),
        dataset,
      };

      trackWidgetClose(basePayload);

      const openedAt = widgetOpenTimestampRef.current;
      if (typeof openedAt === "number") {
        trackWidgetDwell({
          ...basePayload,
          durationMs: Date.now() - openedAt,
        });
      }

      widgetOpenTimestampRef.current = null;
      expandedWidgetRef.current = null;
      setExpandedWidget(null);

      if (shouldRefocus) {
        setTimeout(() => {
          const button = expandButtonRefs.current[key];
          button?.focus();
        }, 50);
      }

      return key;
    },
    [dataset],
  );

  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        return;
      }

      closeExpandedWidget();
    },
    [closeExpandedWidget],
  );

  useEffect(() => {
    if (status === "loading" && data === null && expandedWidget) {
      closeExpandedWidget(false);
    }
  }, [closeExpandedWidget, data, expandedWidget, status]);

  const expandedConfig = useMemo<ExpandedConfig | null>(() => {
    if (!expandedWidget) {
      return null;
    }

    switch (expandedWidget) {
      case "weekly-messages":
        return {
          title: "Messages by Week",
          description: "Detailed time-series view across the full study period.",
          content: <WeeklyMessagesChart data={weeklyMessages} isExpanded className="min-h-[320px]" />,
          insights: hasWeeklyVolume
            ? (
                <p>
                  {`Total messages across the period: ${weeklyMessages
                    .reduce((acc, entry) => acc + entry.messages, 0)
                    .toLocaleString()}.`}
                </p>
              )
            : null,
        };
      case "messages-by-user":
        return {
          title: "Messages by User",
          description: "Expanded participant leaderboard with full rankings.",
          content: <MessagesByUserChart data={messagesByUser} isExpanded className="min-h-[360px]" />,
          insights: hasParticipantVolume
            ? (
                <p>
                  {`${messagesByUser.length.toLocaleString()} participants recorded message activity in this dataset.`}
                </p>
              )
            : null,
        };
      case "categories":
        return {
          title: "Top Categories",
          description: "Full categorical distribution with complete labels.",
          content: <CategoriesChart data={categories} isExpanded className="min-h-[320px]" />,
          insights: categorySummary
            ? (
                <p>
                  {`${categorySummary.name} accounts for approximately ${categorySummary.share}% of total messages.`}
                </p>
              )
            : null,
        };
      case "subcategories":
        return {
          title: "Top Subcategories",
          description: "Granular topics with full label display for analysis.",
          content: <SubcategoriesChart data={subcategories} isExpanded className="min-h-[320px]" />,
          insights: subcategorySummary
            ? (
                <p>
                  {`${subcategorySummary.name} holds roughly ${subcategorySummary.share}% of subcategory volume.`}
                </p>
              )
            : null,
        };
      case "assistant-response":
        return {
          title: "Interaction Fulfillment Rate",
          description: "Detailed view of intents met versus not met with full counts.",
          content: (
            <AssistantResponseWidget
              data={assistantResponses}
              interactions={interactions}
              isExpanded
              className="min-h-[320px]"
            />
          ),
          insights: hasAssistantVolume
            ? (
                <p>
                  {`${assistantSummary.trueCount.toLocaleString()} of ${assistantSummary.total.toLocaleString()} interactions received a satisfactory response.`}
                </p>
              )
            : null,
        };
      case "message-times":
        return {
          title: "Message Times",
          description: "Toggle between aggregate hourly trends and weekday breakdown.",
          content: (
            <div className="flex flex-col gap-4">
              <MessageTimesViewToggleControl
                id={`${messageTimesToggleId}-modal`}
                view={messageTimesView}
                onViewChange={handleMessageTimesViewChange}
                disabled={!dayBreakdownAvailable}
                description={
                  dayBreakdownAvailable
                    ? "Weekday mode reveals which days drive peaks at each hour."
                    : "Weekday breakdown is unavailable for this dataset."
                }
                size="wide"
              />
              <MessageTimesHeatmap
                hourlyData={messageTimes}
                dayData={messageTimesByDay}
                view={messageTimesView}
                isExpanded
                className="min-h-[360px]"
              />
            </div>
          ),
          insights: hasMessageTimesVolume
            ? messageTimesView === "weekday"
              ? <p>Compare darker columns to spot weekday-specific surges in messaging volume.</p>
              : <p>Peak activity aligns with the darkest tiles, indicating the busiest hours overall.</p>
            : null,
        };
      default:
        return null;
    }
  }, [
    assistantResponses,
    assistantSummary,
    categories,
    categorySummary,
    dayBreakdownAvailable,
    expandedWidget,
    hasAssistantVolume,
    hasHourlyVolume,
    hasMessageTimesVolume,
    hasParticipantVolume,
    hasWeeklyVolume,
    handleMessageTimesViewChange,
    messageTimes,
    messageTimesByDay,
    messageTimesToggleId,
    messageTimesView,
    messagesByUser,
    interactions,
    subcategories,
    subcategorySummary,
    weeklyMessages,
  ]);

  return (
    <AppShell>
      <section className="space-y-6">
        {error ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            <span className="text-xs text-red-600">
              Confirm the dataset JSON files in `/data` match the expected schema or review the README troubleshooting notes.
            </span>
            <div>
              <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                Retry loading data
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <Card key={metric.label} className="border-brand-100/60 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide text-slate-500">
                  {metric.label}
                </CardDescription>
                <CardTitle className="text-3xl font-semibold text-slate-900">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">{metric.change}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <DashboardGrid>
          <div className="xl:col-span-2">
            <WidgetCard
              title="Messages by Week"
              description=""
              datasetLabel={datasetLabel}
              onExpand={
                !isLoading && !isError && hasWeeklyVolume
                  ? () => openWidgetModal("weekly-messages")
                  : undefined
              }
              expandButtonRef={setExpandButtonRef("weekly-messages")}
            >
              {isLoading ? (
                <WidgetCard.Loading lines={4} />
              ) : isError ? (
                <WidgetCard.Error
                  action={
                    <Button size="sm" onClick={() => void refreshDataset()}>
                      Retry
                    </Button>
                  }
                />
              ) : !hasWeeklyVolume ? (
                <WidgetCard.Empty
                  action={
                    <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                      Check dataset
                    </Button>
                  }
                />
              ) : (
                <WeeklyMessagesChart data={weeklyMessages} />
              )}
            </WidgetCard>
          </div>
          <WidgetCard
            title="Interaction Fulfillment Rate"
            description="Percentage of user intents the assistant answered successfully"
            datasetLabel={datasetLabel}
            onExpand={
              !isLoading && !isError && hasAssistantVolume
                ? () => openWidgetModal("assistant-response")
                : undefined
            }
            expandButtonRef={setExpandButtonRef("assistant-response")}
            footer={
              hasAssistantVolume ? (
                <span className="text-xs text-slate-500">
                  {assistantSummary.trueCount.toLocaleString()} of {assistantSummary.total.toLocaleString()} interactions received a satisfactory response.
                </span>
              ) : null
            }
          >
            {isLoading ? (
              <WidgetCard.Loading title="Loading response split" lines={3} />
            ) : isError ? (
              <WidgetCard.Error
                action={
                  <Button size="sm" onClick={() => void refreshDataset()}>
                    Retry
                  </Button>
                }
              />
            ) : !hasAssistantVolume ? (
              <WidgetCard.Empty
                action={
                  <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                    Check dataset
                  </Button>
                }
              />
            ) : (
              <AssistantResponseWidget data={assistantResponses} interactions={interactions} />
            )}
          </WidgetCard>
          <div className="xl:col-span-2">
            <WidgetCard
              title="Top Categories"
              description="Distribution of messages across high-level topics"
              datasetLabel={datasetLabel}
              onExpand={
                !isLoading && !isError && hasCategoryVolume
                  ? () => openWidgetModal("categories")
                  : undefined
              }
              expandButtonRef={setExpandButtonRef("categories")}
              footer={
                categorySummary ? (
                  <span className="text-xs text-slate-500">
                    {categorySummary.name} accounts for ~{categorySummary.share}% of total volume.
                  </span>
                ) : null
              }
            >
              {isLoading ? (
                <WidgetCard.Loading title="Loading categories" lines={4} />
              ) : isError ? (
                <WidgetCard.Error
                  action={
                    <Button size="sm" onClick={() => void refreshDataset()}>
                      Retry
                    </Button>
                  }
                />
              ) : !hasCategoryVolume ? (
                <WidgetCard.Empty
                  action={
                    <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                      Check dataset
                    </Button>
                  }
                />
              ) : (
                <CategoriesChart data={categories} />
              )}
            </WidgetCard>
          </div>
          <WidgetCard
            title="Top Subcategories"
            description="More granular topic breakdown"
            datasetLabel={datasetLabel}
            onExpand={
              !isLoading && !isError && hasSubcategoryVolume
                ? () => openWidgetModal("subcategories")
                : undefined
            }
            expandButtonRef={setExpandButtonRef("subcategories")}
            footer={
              subcategorySummary ? (
                <span className="text-xs text-slate-500">
                  {subcategorySummary.name} leads with ~{subcategorySummary.share}% of messages.
                </span>
              ) : null
            }
          >
            {isLoading ? (
              <WidgetCard.Loading title="Loading subcategories" lines={4} />
            ) : isError ? (
              <WidgetCard.Error
                action={
                  <Button size="sm" onClick={() => void refreshDataset()}>
                    Retry
                  </Button>
                }
              />
            ) : !hasSubcategoryVolume ? (
              <WidgetCard.Empty
                action={
                  <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                    Check dataset
                  </Button>
                }
              />
            ) : (
              <SubcategoriesChart data={subcategories} />
            )}
          </WidgetCard>
          <WidgetCard
            title="Messages by User"
            description="Top participants horizontal bar chart"
            datasetLabel={datasetLabel}
            onExpand={
              !isLoading && !isError && hasParticipantVolume
                ? () => openWidgetModal("messages-by-user")
                : undefined
            }
            expandButtonRef={setExpandButtonRef("messages-by-user")}
            footer={
              <span className="text-xs text-slate-500">
                Expand to view the full participant list.
              </span>
            }
          >
            {isLoading ? (
              <WidgetCard.Loading title="Loading participant list" lines={4} />
            ) : isError ? (
              <WidgetCard.Error
                action={
                  <Button size="sm" onClick={() => void refreshDataset()}>
                    Retry
                  </Button>
                }
              />
            ) : !hasParticipantVolume ? (
              <WidgetCard.Empty
                action={
                  <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                    Check dataset
                  </Button>
                }
              />
            ) : (
              <MessagesByUserChart data={messagesByUser} />
            )}
          </WidgetCard>
          <div className="xl:col-span-2">
            <WidgetCard
              title="Message Times"
              description="Hourly heatmap with an optional weekday view"
              datasetLabel={datasetLabel}
              actions={
                <MessageTimesViewToggleControl
                  id={messageTimesToggleId}
                  view={messageTimesView}
                  onViewChange={handleMessageTimesViewChange}
                  disabled={messageTimesToggleDisabled}
                />
              }
              onExpand={
                !isLoading && !isError && hasMessageTimesVolume
                  ? () => openWidgetModal("message-times")
                  : undefined
              }
              expandButtonRef={setExpandButtonRef("message-times")}
            >
              {isLoading ? (
                <WidgetCard.Loading title="Loading hourly distribution" lines={6} />
              ) : isError ? (
                <WidgetCard.Error
                  action={
                    <Button size="sm" onClick={() => void refreshDataset()}>
                      Retry
                    </Button>
                  }
                />
              ) : !hasMessageTimesVolume ? (
                <WidgetCard.Empty
                  action={
                    <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                      Check dataset
                    </Button>
                  }
                />
              ) : (
                <MessageTimesHeatmap
                  hourlyData={messageTimes}
                  dayData={messageTimesByDay}
                  view={messageTimesView}
                  isExpanded={false}
                />
              )}
            </WidgetCard>
          </div>
        </DashboardGrid>
      </section>
      {expandedConfig ? (
        <WidgetModal
          open={Boolean(expandedWidget)}
          onOpenChange={handleModalOpenChange}
          title={expandedConfig.title}
          description={expandedConfig.description}
          datasetLabel={datasetLabel}
          datasetDescription={datasetDescription}
          lastUpdated={datasetLastUpdated}
          loadedAt={datasetLoadedAt}
          insights={expandedConfig.insights}
        >
          {expandedConfig.content}
        </WidgetModal>
      ) : null}
    </AppShell>
  );
}

type ExpandedWidgetKey =
  | "weekly-messages"
  | "messages-by-user"
  | "categories"
  | "subcategories"
  | "assistant-response"
  | "message-times";

interface ExpandedConfig {
  title: string;
  description: string;
  content: ReactNode;
  insights: ReactNode | null;
}

interface MessageTimesViewToggleControlProps {
  id: string;
  view: MessageTimesView;
  onViewChange: (view: MessageTimesView) => void;
  disabled?: boolean;
  description?: string;
  size?: "compact" | "wide";
  className?: string;
}

function MessageTimesViewToggleControl({
  id,
  view,
  onViewChange,
  disabled = false,
  description,
  size = "compact",
  className,
}: MessageTimesViewToggleControlProps) {
  const checked = view === "weekday";
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("flex items-center gap-2", size === "wide" ? "text-sm" : "text-xs")}>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={(state) => onViewChange(state ? "weekday" : "aggregate")}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
        />
        <label
          id={labelId}
          htmlFor={id}
          className={cn(
            "select-none font-medium text-slate-600",
            size === "wide" ? "text-sm" : "text-xs",
            disabled ? "text-slate-300" : undefined,
          )}
        >
          Weekday view
        </label>
      </div>
      {description ? (
        <span
          id={descriptionId}
          className={cn(
            "font-normal text-slate-400",
            size === "wide" ? "text-xs" : "text-[11px]",
          )}
        >
          {description}
        </span>
      ) : null}
    </div>
  );
}
