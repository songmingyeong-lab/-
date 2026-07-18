import { getDashboardData } from "@/lib/dashboard-data";

export async function GET() {
  const data = await getDashboardData();
  return Response.json({ status: data.status, data: [data.area] });
}
