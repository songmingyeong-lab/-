import { describe, expect, it } from "vitest";
import { summarizeBuildingRegister, type BuildingRegisterRow } from "@/lib/collection/adapters/building-register";

const target = { cityName: "서울특별시", districtName: "구로구", dongName: "가리봉동" };

function row(overrides: Partial<BuildingRegisterRow> = {}): BuildingRegisterRow {
  return {
    PLAT_PLC: "서울특별시 구로구 가리봉동 1-1",
    SGG_CD_NM: "서울특별시 구로구",
    STDG_CD_NM: "가리봉동",
    BDRG_SN: "1",
    MN_USG_CD_NM: "교육연구및복지시설",
    USE_APRV_YMD: "1990-01-01",
    ...overrides,
  };
}

describe("building register summary", () => {
  it("filters the exact legal dong and counts the two requested main-use categories", () => {
    const result = summarizeBuildingRegister([
      row(),
      row({ BDRG_SN: "2", PLAT_PLC: "서울특별시 구로구 가리봉동 2-1", MN_USG_CD_NM: "문화및집회시설" }),
      row({ BDRG_SN: "3", PLAT_PLC: "서울특별시 구로구 가리봉동 3-1", MN_USG_CD_NM: "단독주택" }),
      row({ BDRG_SN: "4", PLAT_PLC: "서울특별시 구로구 구로동 4-1", STDG_CD_NM: "구로동" }),
    ], target);

    expect(result).toMatchObject({
      totalCount: 3,
      educationWelfareCount: 1,
      cultureAssemblyCount: 1,
      targetFacilityCount: 2,
      knownCount: 3,
      agedCount: 3,
      agedRatio: 100,
    });
  });

  it("deduplicates the same ledger and address", () => {
    const result = summarizeBuildingRegister([row(), row()], target);
    expect(result.totalCount).toBe(1);
    expect(result.targetFacilityCount).toBe(1);
  });
});
