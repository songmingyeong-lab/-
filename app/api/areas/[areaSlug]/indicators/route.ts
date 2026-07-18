import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string }> }) {
  const { areaSlug } = await params;
  const data = await getDashboardData();
  if (areaSlug !== data.area.slug) return Response.json({ status: "empty", data: [] }, { status: 404 });
  return Response.json({ status: data.status, data: data.indicators });
}
