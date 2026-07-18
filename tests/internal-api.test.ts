import { describe, expect, it } from "vitest";
import { GET as getAreas } from "@/app/api/areas/route";
import { GET as getIndicator } from "@/app/api/areas/[areaSlug]/indicators/[indicatorCode]/route";
import { GET as getChart } from "@/app/api/areas/[areaSlug]/charts/[chartCode]/route";

describe("internal API", () => {
  it("returns the configured area", async () => {
    const response = await getAreas();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data[0].slug).toBe("garibong");
  });
  it("returns an indicator and preserves chart gaps", async () => {
    const indicatorResponse = await getIndicator(new Request("http://local.test"), { params: Promise.resolve({ areaSlug: "garibong", indicatorCode: "living_population" }) });
    expect((await indicatorResponse.json()).data.code).toBe("living_population");
    const chartResponse = await getChart(new Request("http://local.test"), { params: Promise.resolve({ areaSlug: "garibong", chartCode: "living_population" }) });
    const chart = await chartResponse.json();
    expect(chart.data.points.some((point: { value: number | null }) => point.value === null)).toBe(true);
  });
  it("returns 404 for an unknown indicator", async () => {
    const response = await getIndicator(new Request("http://local.test"), { params: Promise.resolve({ areaSlug: "garibong", indicatorCode: "unknown" }) });
    expect(response.status).toBe(404);
  });
});
