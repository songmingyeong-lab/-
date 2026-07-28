import { afterEach, describe, expect, it, vi } from "vitest";
import { binzibeVacancyAdapter } from "@/lib/collection/adapters/binzibe-vacancy";

const context = {
  areaSlug: "changsin-1",
  cityName: "서울특별시",
  districtName: "종로구",
  administrativeDongCode: "11110670",
  administrativeDongName: "창신1동",
  legalDongCode: "1111017400",
  legalDongName: "창신동",
  dongName: "창신1동",
  apiKey: "",
  now: new Date("2026-07-27T00:00:00Z"),
};

afterEach(() => vi.unstubAllGlobals());

describe("Binzibe vacancy adapter", () => {
  it("maps the observed legal-dong aggregate without inventing an administrative-dong value", async () => {
    const payload = [
      { reg: "11110", sojaeji: "서울특별시_종로구_창신동", binCnt: 30, baseLevel: 3, rnk: 1 },
      { reg: "11110", sojaeji: "서울특별시_종로구_숭인동", binCnt: 5, baseLevel: 3, rnk: 2 },
      { reg: "11110", sojaeji: "서울특별시_종로구", binCnt: 411, baseLevel: 2, rnk: 1 },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ years: [{ year: 2026 }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await binzibeVacancyAdapter.collect(context);
    const indicator = result.indicators[0];

    expect(result.status).toBe("success");
    expect(indicator.value).toBe(30);
    expect(indicator.geographicUnit).toContain("창신동 법정동 전체");
    expect(indicator.geographicUnit).toContain("창신1동 대체값");
    expect(indicator.statusMessage).toContain("행정동 독립값을 제공하지 않아");
    expect(indicator.spatialComparison?.candidates).toHaveLength(1);
    expect(indicator.spatialComparison?.candidates[0]).toMatchObject({
      areaName: "숭인동",
      value: 5,
      geographicUnit: "LEGAL_DONG",
    });
  });

  it("returns empty instead of zero when the target legal dong is absent", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("<html></html>", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ years: [{ year: 2026 }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { reg: "11110", sojaeji: "서울특별시_종로구_숭인동", binCnt: 5, baseLevel: 3 },
      ]), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await binzibeVacancyAdapter.collect(context);
    expect(result.status).toBe("empty");
    expect(result.indicators).toEqual([]);
  });
});
