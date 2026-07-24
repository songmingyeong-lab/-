import { getDashboardData } from "@/lib/dashboard-data";
import { getTargetArea } from "@/lib/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string; chartCode: string }> }) {
  const { areaSlug, chartCode } = await params;
  if (!getTargetArea(areaSlug)) return Response.json({ status: "empty", data: [] }, { status: 404 });
  const data = await getDashboardData(areaSlug);
  const indicator = data.indicators.find((item) => item.code === chartCode);
  if (!indicator) return Response.json({ status: "empty", data: [] }, { status: 404 });
  return Response.json({ status: indicator.status, data: { code: indicator.code, unit: indicator.unit, source: indicator.source, points: indicator.series } });
}
