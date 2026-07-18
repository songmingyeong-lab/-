import { describe, expect, it } from "vitest";
import { summarizeBuildingRegister, type BuildingRegisterRow } from "@/lib/collection/adapters/building-register";

const target = { cityName: "서울특별시", districtName: "구로구", dongName: "가리봉동" };

function row(overrides: Partial<BuildingRegisterRow> = {}): BuildingRegisterRow {
  return {
    PLAT_PLC: "서울특별시 구로구 가리봉동 1-1",
    SGG_CD_NM: "서울특별시 구로구",
    STDG_CD_NM: "가리봉동",
    BDRG_SN: "1",
    USE_APRV_YMD: "1990-01-01",
    ...overrides,
  };
}

describe("building register summary", () => {
  it("filters the exact district and legal dong and excludes missing approval dates", () => {
    const result = summarizeBuildingRegister([
      row(),
      row({ BDRG_SN: "2", PLAT_PLC: "서울특별시 구로구 가리봉동 2-1", USE_APRV_YMD: "2010-01-01" }),
      row({ BDRG_SN: "3", PLAT_PLC: "서울특별시 구로구 가리봉동 3-1", USE_APRV_YMD: "" }),
      row({ BDRG_SN: "4", PLAT_PLC: "서울특별시 구로구 구로동 4-1", STDG_CD_NM: "구로동" }),
    ], target, new Date("2026-07-18T00:00:00Z"));

    expect(result).toMatchObject({ totalCount: 3, knownCount: 2, missingCount: 1, agedCount: 1, ratio: 50 });
    expect(result.coverageRate).toBeCloseTo(200 / 3);
  });

  it("deduplicates the same ledger and address", () => {
    const result = summarizeBuildingRegister([row(), row()], target, new Date("2026-07-18T00:00:00Z"));
    expect(result.totalCount).toBe(1);
  });
});
