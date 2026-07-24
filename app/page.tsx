import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";
import { connection } from "next/server";
import { resolveTargetArea, targetAreas } from "@/lib/areas";

export default async function Home({ searchParams }: { searchParams: Promise<{ area?: string | string[] }> }) {
  await connection();
  const requested = (await searchParams).area;
  const area = resolveTargetArea(Array.isArray(requested) ? requested[0] : requested);
  const data = await getDashboardData(area.slug);
  const areaOptions = targetAreas.map((item) => ({ slug: item.slug, label: `${item.districtName} ${item.administrativeDongName}` }));
  return <Dashboard data={data} areas={areaOptions} />;
}
