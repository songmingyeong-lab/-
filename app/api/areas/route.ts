import { targetAreas } from "@/lib/areas";

export async function GET() {
  return Response.json({
    status: "success",
    data: targetAreas.map((area) => ({
      slug: area.slug,
      name: `${area.cityName} ${area.districtName} ${area.administrativeDongName}`,
      cityName: area.cityName,
      districtName: area.districtName,
      administrativeDongName: area.administrativeDongName,
      administrativeDongCode: area.administrativeDongCode,
      legalDongName: area.legalDongName,
      legalDongCode: area.legalDongCode,
      projectName: area.projectName,
      projectType: area.projectType,
      scope: area.scopeDescription,
    })),
  });
}
