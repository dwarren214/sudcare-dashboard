import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

interface AppShellProps {
  children: ReactNode;
  toolbar?: ReactNode;
}

export function AppShell({ children, toolbar }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex-1 py-6">
        <Container className="flex flex-col gap-6">
          {toolbar ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{toolbar}</div>
          ) : null}
          {children}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
