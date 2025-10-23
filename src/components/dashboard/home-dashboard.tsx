"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { useDashboardData, type ParticipantCohortSummary } from "@/components/dashboard/dashboard-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WeeklyMessagesChart } from "@/components/dashboard/widgets/weekly-messages-chart";
import { MessagesByUserChart } from "@/components/dashboard/widgets/messages-by-user-chart";
import { CategoriesChart } from "@/components/dashboard/widgets/categories-chart";
import { SubcategoriesChart } from "@/components/dashboard/widgets/subcategories-chart";
import { AssistantResponseWidget } from "@/components/dashboard/widgets/assistant-response-chart";
import { MessagesByCalendarWeekChart } from "@/components/dashboard/widgets/messages-by-calendar-week-chart";
import { MessageTimesHeatmap, type MessageTimesView } from "@/components/dashboard/widgets/message-times-heatmap";
import { WidgetModal, type WidgetModalExportConfig } from "@/components/dashboard/widget-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { buildIntentNotMetBreakdown, summarizeAssistantResponses } from "@/lib/dashboard-transforms";
import {
  trackMessageTimesViewChange,
  trackWidgetClose,
  trackWidgetDwell,
  trackWidgetExpand,
} from "@/lib/analytics";
import { buildCsvDocument, type CsvMetadataEntry, type CsvSection } from "@/lib/csv";
import type { DatasetKey } from "../../../types/dashboard";

const CALENDAR_WEEK_FULL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

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
    refreshDataset,
    cohort,
  } = useDashboardData();
  const [expandedWidget, setExpandedWidget] = useState<ExpandedWidgetKey | null>(null);
  const [messageTimesView, setMessageTimesView] = useState<MessageTimesView>("aggregate");
  const messageTimesToggleId = useId();

  const expandedWidgetRef = useRef<ExpandedWidgetKey | null>(null);
  useEffect(() => {
    expandedWidgetRef.current = expandedWidget;
  }, [expandedWidget]);

  const widgetOpenTimestampRef = useRef<number | null>(null);

  const datasetLastUpdated = data?.last_updated ?? "--";
  const datasetLoadedAt = meta?.loadedAt ?? null;

  const weeklyMessages = useMemo(() => data?.metrics.weekly_messages ?? [], [data]);
  const messagesByUser = useMemo(() => data?.metrics.messages_by_user ?? [], [data]);
  const categories = useMemo(() => data?.metrics.categories ?? [], [data]);
  const subcategories = useMemo(() => data?.metrics.subcategories ?? [], [data]);
  const assistantResponses = useMemo(() => data?.metrics.suzy_can_respond ?? [], [data]);
  const messageTimes = useMemo(() => data?.metrics.message_times ?? [], [data]);
  const messageTimesByDay = useMemo(() => data?.metrics.message_times_by_day ?? [], [data]);
  const messagesByCalendarWeek = useMemo(() => data?.metrics.messages_by_calendar_week ?? [], [data]);

  const hasWeeklyVolume = weeklyMessages.some((entry) => entry.messages > 0);
  const hasParticipantVolume = messagesByUser.some((entry) => entry.count > 0);
  const hasCategoryVolume = categories.some((entry) => entry.count > 0);
  const hasSubcategoryVolume = subcategories.some((entry) => entry.count > 0);
  const assistantSummary = useMemo(() => summarizeAssistantResponses(assistantResponses), [assistantResponses]);
  const assistantBreakdown = useMemo(() => buildIntentNotMetBreakdown(interactions), [interactions]);
  const hasAssistantVolume = assistantSummary.total > 0;
  const hasHourlyVolume = messageTimes.some((entry) => entry.count > 0);
  const hasDayOfWeekVolume = messageTimesByDay.some((entry) => entry.count > 0);
  const hasMessageTimesVolume = hasHourlyVolume || hasDayOfWeekVolume;
  const hasCalendarWeekVolume = messagesByCalendarWeek.some((entry) => entry.messages > 0);
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

  const calendarWeekSummary = useMemo(() => {
    if (messagesByCalendarWeek.length === 0) {
      return null;
    }

    const total = messagesByCalendarWeek.reduce((acc, entry) => acc + entry.messages, 0);
    let busiest = messagesByCalendarWeek[0];

    messagesByCalendarWeek.forEach((entry) => {
      if (entry.messages > busiest.messages) {
        busiest = entry;
      }
    });

    const first = messagesByCalendarWeek[0];
    const last = messagesByCalendarWeek[messagesByCalendarWeek.length - 1];

    return {
      total,
      busiest,
      first,
      last,
    };
  }, [messagesByCalendarWeek]);

  const summaryMetrics = useMemo(() => {
    if (!data) {
      return [
        { label: "Messages (week)", value: "--", change: "Loading metrics" },
        { label: "Active participants", value: "--", change: "Loading metrics" },
        { label: "Intent fulfillment", value: "--", change: "Loading metrics" },
        {
          label: "Active cohort",
          value: cohort.label,
          change: cohort.isActive ? cohort.description : "Loading metrics",
        },
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
        label: "Active cohort",
        value: cohort.label,
        change: cohort.isActive
          ? cohort.description
          : datasetLoadedAt
            ? `Loaded ${new Date(datasetLoadedAt).toLocaleString()}`
            : `Last updated ${datasetLastUpdated}`,
      },
    ];
  }, [cohort, data, datasetLoadedAt, datasetLastUpdated]);

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

  const buildExportConfig = useCallback(
    (
      key: ExpandedWidgetKey,
      buildSections: () => CsvSection[],
      buildExtraMetadata?: () => CsvMetadataEntry[],
    ): WidgetModalExportConfig => ({
      widgetKey: key,
      dataset,
      cohortMode: cohort.isActive ? cohort.mode : "all",
      selectedParticipantIds: [...cohort.selectedIds],
      buildCsv: async () =>
        buildCsvDocument({
          metadata: [
            ...buildExportMetadata({
              dataset,
              cohort,
              lastUpdated: datasetLastUpdated,
              loadedAt: datasetLoadedAt,
            }),
            ...(buildExtraMetadata ? buildExtraMetadata() : []),
          ],
          sections: buildSections(),
        }),
    }),
    [cohort, dataset, datasetLastUpdated, datasetLoadedAt],
  );

  const expandedConfig = useMemo<ExpandedConfig | null>(() => {
    if (!expandedWidget) {
      return null;
    }

    switch (expandedWidget) {
      case "weekly-messages":
        return {
          title: "Messages by Study Week",
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
          exportConfig: buildExportConfig("weekly-messages", () => [
            {
              title: "Messages by Study Week",
              headers: ["Study week", "Messages"],
              rows: weeklyMessages.map((entry) => [entry.week, entry.messages]),
            },
          ]),
        };
      case "messages-by-calendar-week":
        return {
          title: "Messages by Absolute Time",
          description: "Calendar-week trend chart to inspect real-world engagement cadence.",
          content: <MessagesByCalendarWeekChart data={messagesByCalendarWeek} isExpanded className="min-h-[360px]" />,
          insights: hasCalendarWeekVolume && calendarWeekSummary
            ? (
                <p>
                  {`Busiest week started ${formatCalendarWeekLabel(calendarWeekSummary.busiest.weekStart)} with ${calendarWeekSummary.busiest.messages.toLocaleString()} messages.`}
                </p>
              )
            : null,
          exportConfig: buildExportConfig("messages-by-calendar-week", () => [
            {
              title: "Messages by Calendar Week",
              headers: ["ISO week", "Week start", "Messages"],
              rows: messagesByCalendarWeek.map((entry) => [entry.isoWeek, entry.weekStart, entry.messages]),
            },
          ]),
        };
      case "messages-by-user":
        return {
          title: "Messages by User",
          description: "Expanded participant leaderboard with full rankings.",
          content: <MessagesByUserChart data={messagesByUser} isExpanded className="min-h-[360px]" />,
          insights: hasParticipantVolume
            ? (
                <p>{`${messagesByUser.length.toLocaleString()} participants recorded message activity in this view.`}</p>
              )
            : null,
          exportConfig: buildExportConfig("messages-by-user", () => [
            {
              title: "Messages by User",
              headers: ["Participant", "Messages"],
              rows: messagesByUser.map((entry) => [entry.participant, entry.count]),
            },
          ]),
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
          exportConfig: buildExportConfig("categories", () => [
            {
              title: "Top Categories",
              headers: ["Category", "Messages"],
              rows: categories.map((entry) => [entry.name, entry.count]),
            },
          ]),
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
          exportConfig: buildExportConfig("subcategories", () => [
            {
              title: "Top Subcategories",
              headers: ["Subcategory", "Messages"],
              rows: subcategories.map((entry) => [entry.name, entry.count]),
            },
          ]),
        };
      case "assistant-response":
        return {
          title: "User Interaction Fulfillment Rate",
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
          exportConfig: buildExportConfig("assistant-response", () => {
            const sections: CsvSection[] = [
              {
                title: "Fulfillment Summary",
                headers: ["Status", "Count"],
                rows: [
                  ["Intent met", assistantSummary.trueCount],
                  ["Intent not met", assistantSummary.falseCount],
                  ["Total interactions", assistantSummary.total],
                  ["Fulfillment rate (%)", assistantSummary.total === 0 ? 0 : assistantSummary.percentageTrue],
                ],
              },
            ];

            if (assistantBreakdown.categories.length > 0) {
              sections.push({
                title: "Needs Follow-up by Category",
                headers: ["Category", "Messages"],
                rows: assistantBreakdown.categories.map((entry) => [entry.name, entry.count]),
              });
            }

            if (assistantBreakdown.subcategories.length > 0) {
              sections.push({
                title: "Needs Follow-up by Subcategory",
                headers: ["Subcategory", "Messages"],
                rows: assistantBreakdown.subcategories.map((entry) => [entry.name, entry.count]),
              });
            }

            return sections;
          }),
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
                    : "Weekday breakdown is unavailable for this view."
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
          exportConfig: buildExportConfig(
            "message-times",
            () => {
              const sections: CsvSection[] = [
                {
                  title: "Hourly Distribution",
                  headers: ["Hour (0-23)", "Messages"],
                  rows: messageTimes.map((entry) => [entry.hour, entry.count]),
                },
              ];

              if (messageTimesByDay.length > 0) {
                sections.push({
                  title: "Weekday Distribution",
                  headers: ["Day", "Hour", "Messages"],
                  rows: messageTimesByDay.map((entry) => [entry.day, entry.hour, entry.count]),
                });
              }

              return sections;
            },
            () => [
              {
                label: "Message times view",
                value: messageTimesView === "weekday" ? "Weekday (per day)" : "Aggregate (all days)",
              },
            ],
          ),
        };
      default:
        return null;
    }
  }, [
    assistantResponses,
    assistantBreakdown,
    assistantSummary,
    categories,
    categorySummary,
    dayBreakdownAvailable,
    expandedWidget,
    hasAssistantVolume,
    hasCalendarWeekVolume,
    hasMessageTimesVolume,
    hasParticipantVolume,
    hasWeeklyVolume,
    handleMessageTimesViewChange,
    calendarWeekSummary,
    messagesByCalendarWeek,
    messageTimes,
    messageTimesByDay,
    messageTimesToggleId,
    messageTimesView,
    messagesByUser,
    interactions,
    subcategories,
    subcategorySummary,
    weeklyMessages,
    buildExportConfig,
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
              title="Messages by Study Week"
              description=""
              cohortLabel={cohort.label}
              cohortTone={cohort.tone}
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
          <div className="xl:col-span-2">
            <WidgetCard
              title="Messages by Absolute Time"
              description="Calendar-week trend showing raw message volume"
              cohortLabel={cohort.label}
              cohortTone={cohort.tone}
              onExpand={
                !isLoading && !isError && hasCalendarWeekVolume
                  ? () => openWidgetModal("messages-by-calendar-week")
                  : undefined
              }
              expandButtonRef={setExpandButtonRef("messages-by-calendar-week")}
              footer={
                calendarWeekSummary ? (
                  <span className="text-xs text-slate-500">
                    {`${formatCalendarWeekLabel(calendarWeekSummary.first.weekStart)} – ${formatCalendarWeekLabel(
                      calendarWeekSummary.last.weekStart,
                    )} · ${calendarWeekSummary.total.toLocaleString()} total messages`}
                  </span>
                ) : null
              }
            >
              {isLoading ? (
                <WidgetCard.Loading title="Loading calendar trend" lines={4} />
              ) : isError ? (
                <WidgetCard.Error
                  action={
                    <Button size="sm" onClick={() => void refreshDataset()}>
                      Retry
                    </Button>
                  }
                />
              ) : !hasCalendarWeekVolume ? (
                <WidgetCard.Empty
                  action={
                    <Button size="sm" variant="outline" onClick={() => void refreshDataset()}>
                      Check dataset
                    </Button>
                  }
                  description="No calendar-week data available for the current cohort."
                />
              ) : (
                <MessagesByCalendarWeekChart data={messagesByCalendarWeek} />
              )}
            </WidgetCard>
          </div>
          <WidgetCard
            title="User Interaction Fulfillment Rate"
            description="Percentage of user intents the assistant answered successfully"
            cohortLabel={cohort.label}
            cohortTone={cohort.tone}
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
              cohortLabel={cohort.label}
              cohortTone={cohort.tone}
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
            cohortLabel={cohort.label}
            cohortTone={cohort.tone}
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
            cohortLabel={cohort.label}
            cohortTone={cohort.tone}
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
              cohortLabel={cohort.label}
              cohortTone={cohort.tone}
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
          cohortLabel={cohort.label}
          cohortTone={cohort.tone}
          cohortDescription={cohort.description}
          lastUpdated={datasetLastUpdated}
          loadedAt={datasetLoadedAt}
          insights={expandedConfig.insights}
          exportConfig={expandedConfig.exportConfig}
        >
          {expandedConfig.content}
        </WidgetModal>
      ) : null}
    </AppShell>
  );
}

function formatCalendarWeekLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return CALENDAR_WEEK_FULL_FORMATTER.format(date);
}

function buildExportMetadata({
  dataset,
  cohort,
  lastUpdated,
  loadedAt,
}: {
  dataset: DatasetKey;
  cohort: ParticipantCohortSummary;
  lastUpdated?: string | null;
  loadedAt?: string | null;
}): CsvMetadataEntry[] {
  const entries: CsvMetadataEntry[] = [
    { label: "Dataset", value: dataset },
    { label: "Cohort label", value: cohort.label },
    { label: "Cohort description", value: cohort.description },
  ];

  if (cohort.isActive) {
    entries.push({
      label: "Filter mode",
      value: cohort.mode === "include" ? "Include selected participants" : "Exclude selected participants",
    });
    entries.push({
      label: "Selected participants",
      value: cohort.selectedIds.length > 0 ? cohort.selectedIds.join(", ") : "None",
    });
  } else {
    entries.push({ label: "Filter mode", value: "All participants" });
    entries.push({ label: "Selected participants", value: "None" });
  }

  const loadedLabel = formatMetadataTimestamp(loadedAt);
  if (loadedLabel) {
    entries.push({ label: "Data loaded at", value: loadedLabel });
  }

  if (lastUpdated && lastUpdated !== "--") {
    entries.push({ label: "Dataset last updated", value: formatMetadataDate(lastUpdated) });
  }

  entries.push({ label: "Generated at", value: new Date().toLocaleString() });

  return entries;
}

function formatMetadataTimestamp(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return value;
}

function formatMetadataDate(value?: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }
  return value;
}

type ExpandedWidgetKey =
  | "weekly-messages"
  | "messages-by-calendar-week"
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
  exportConfig?: WidgetModalExportConfig;
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
