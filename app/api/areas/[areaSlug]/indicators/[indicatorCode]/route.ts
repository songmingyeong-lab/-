import { getDashboardData } from "@/lib/dashboard-data";
import { getTargetArea } from "@/lib/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string; indicatorCode: string }> }) {
  const { areaSlug, indicatorCode } = await params;
  if (!getTargetArea(areaSlug)) return Response.json({ status: "empty", error: "지역을 찾을 수 없습니다." }, { status: 404 });
  const data = await getDashboardData(areaSlug);
  const indicator = data.indicators.find((item) => item.code === indicatorCode);
  if (!indicator) return Response.json({ status: "empty", error: "지표를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ status: indicator.status, data: indicator });
}
