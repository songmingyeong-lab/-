import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";

export default async function Home() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
