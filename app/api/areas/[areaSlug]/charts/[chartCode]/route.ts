import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string; chartCode: string }> }) {
  const { areaSlug, chartCode } = await params;
  const data = await getDashboardData();
  const indicator = areaSlug === data.area.slug ? data.indicators.find((item) => item.code === chartCode) : undefined;
  if (!indicator) return Response.json({ status: "empty", data: [] }, { status: 404 });
  return Response.json({ status: indicator.status, data: { code: indicator.code, unit: indicator.unit, source: indicator.source, points: indicator.series } });
}
