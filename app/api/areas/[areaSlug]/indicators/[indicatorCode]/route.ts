import { getDashboardData } from "@/lib/dashboard-data";
import { getTargetArea } from "@/lib/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string; indicatorCode: string }> }) {
  const { areaSlug, indicatorCode } = await params;
  if (!getTargetArea(areaSlug)) return Response.json({ status: "empty", error: "지역을 찾을 수 없습니다." }, { status: 404 });
  const data = await getDashboardData(areaSlug);
  const indicator = data.indicators.find((item) => item.code === indicatorCode);
  if (!indicator) return Response.json({ status: "empty", error: "지표를 찾을 수 없습니다." }, { status: 404 });
  const indicatorScore = data.categoryScores.flatMap((category) => category.indicatorScores)
    .find((score) => score.indicatorCode === indicatorCode);
  const comparisonScoreStatus = indicator.area === "상권 변화"
    ? data.comparisonAvailability.quality === "insufficient"
      ? "insufficient_comparison_group"
      : data.comparisonAvailability.quality === "low"
        ? "limited_comparison"
        : indicatorScore?.scoreStatus.toLowerCase() ?? "calculated"
    : indicatorScore?.scoreStatus.toLowerCase() ?? "not_scored";
  return Response.json({
    status: indicator.status,
    data: indicator,
    comparisonAvailability: data.comparisonAvailability,
    scoreStatus: comparisonScoreStatus,
  });
}
