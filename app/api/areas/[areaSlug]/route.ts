import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string }> }) {
  const { areaSlug } = await params;
  const data = await getDashboardData();
  if (areaSlug !== data.area.slug) return Response.json({ status: "empty", error: "지역을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ status: data.status, data: data.area });
}
