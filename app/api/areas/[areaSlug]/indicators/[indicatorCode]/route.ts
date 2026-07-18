import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string; indicatorCode: string }> }) {
  const { areaSlug, indicatorCode } = await params;
  const data = await getDashboardData();
  const indicator = areaSlug === data.area.slug ? data.indicators.find((item) => item.code === indicatorCode) : undefined;
  if (!indicator) return Response.json({ status: "empty", error: "지표를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ status: indicator.status, data: indicator });
}
