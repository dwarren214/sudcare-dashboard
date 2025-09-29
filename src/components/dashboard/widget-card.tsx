import type { HTMLAttributes, ReactNode } from "react";

import { AlertCircle, Database, Expand, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  datasetLabel?: string;
  infoSlot?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  onExpand?: () => void;
  expandButtonRef?: (node: HTMLButtonElement | null) => void;
  children?: ReactNode;
}

interface WidgetCardStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

function WidgetCardRoot({
  title,
  description,
  datasetLabel,
  infoSlot,
  actions,
  footer,
  onExpand,
  expandButtonRef,
  children,
  className,
  ...props
}: WidgetCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)} {...props}>
      <CardHeader className="gap-4 border-b border-slate-100/80 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {infoSlot ?? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500"
                disabled
                aria-label="Info tooltip coming soon"
              >
                <Info className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {actions}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600"
              onClick={onExpand}
              aria-label={onExpand ? `Expand ${title}` : "Expand coming soon"}
              disabled={!onExpand}
              ref={onExpand ? expandButtonRef : undefined}
            >
              <Expand className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
        {datasetLabel ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-400" aria-hidden />
            <span>{datasetLabel}</span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-6">{children}</CardContent>
      {footer ? (
        <CardFooter className="border-t border-slate-100 bg-slate-50/60 p-6 pt-4 text-sm text-slate-500">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

function WidgetCardState({ title, description, action, icon, children }: WidgetCardStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-600">
      <div className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-3 text-slate-500">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-slate-700">{title}</p>
        {description ? <p className="text-xs leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {children}
      {action}
    </div>
  );
}

interface WidgetCardLoadingProps extends Partial<WidgetCardStateProps> {
  lines?: number;
}

function WidgetCardLoading({ lines = 3, ...props }: WidgetCardLoadingProps) {
  return (
    <WidgetCardState
      icon={<Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      title="Loading data"
      description="Fetching the latest study metrics."
      {...props}
    >
      <div className="flex w-full flex-col items-center gap-2" aria-hidden>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
        ))}
      </div>
    </WidgetCardState>
  );
}

function WidgetCardEmpty(props: Partial<WidgetCardStateProps>) {
  return (
    <WidgetCardState
      icon={<Database className="h-5 w-5" aria-hidden />}
      title="No data available"
      description="Dataset returned no rows. Confirm the JSON file has values for this metric."
      {...props}
    />
  );
}

function WidgetCardError(props: Partial<WidgetCardStateProps>) {
  return (
    <WidgetCardState
      icon={<AlertCircle className="h-5 w-5 text-danger" aria-hidden />}
      title="Unable to load metrics"
      description="We couldn’t fetch this dataset. Refresh the page or review the README data loading steps."
      {...props}
    />
  );
}

export const WidgetCard = Object.assign(WidgetCardRoot, {
  State: WidgetCardState,
  Loading: WidgetCardLoading,
  Empty: WidgetCardEmpty,
  Error: WidgetCardError,
});

export type { WidgetCardProps, WidgetCardStateProps };
