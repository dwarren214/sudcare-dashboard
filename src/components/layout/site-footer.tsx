import { Container } from "@/components/layout/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500">
      <Container className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Dimagi</span>
      </Container>
    </footer>
  );
}
