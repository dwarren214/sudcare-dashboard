import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { getAllDataset } from "@/lib/data-repository";

export default async function HomePage() {
  const initialResult = await getAllDataset();

  return (
    <DashboardDataProvider initialDataset="all" initialResult={initialResult}>
      <HomeDashboard />
    </DashboardDataProvider>
  );
}
