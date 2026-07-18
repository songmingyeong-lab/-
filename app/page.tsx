import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
