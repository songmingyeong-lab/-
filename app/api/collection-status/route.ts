import { getDashboardData } from "@/lib/dashboard-data";

export async function GET() {
  const data = await getDashboardData();
  return Response.json({ status: data.status, mode: data.mode, lastCollectedAt: data.lastCollectedAt, sources: data.indicators.map(({ code, status, baseDate, source }) => ({ code, status, baseDate, source })) });
}
