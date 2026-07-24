import { getDashboardData } from "@/lib/dashboard-data";
import { getTargetArea } from "@/lib/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ areaSlug: string }> }) {
  const { areaSlug } = await params;
  if (!getTargetArea(areaSlug)) return Response.json({ status: "empty", data: [] }, { status: 404 });
  const data = await getDashboardData(areaSlug);
  return Response.json({ status: data.status, data: data.indicators });
}
