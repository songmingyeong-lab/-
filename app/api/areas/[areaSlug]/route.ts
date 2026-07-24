import { getDashboardData } from "@/lib/dashboard-data";
import { getTargetArea } from "@/lib/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string }> }) {
  const { areaSlug } = await params;
  if (!getTargetArea(areaSlug)) return Response.json({ status: "empty", error: "지역을 찾을 수 없습니다." }, { status: 404 });
  const data = await getDashboardData(areaSlug);
  return Response.json({ status: data.status, data: data.area });
}
