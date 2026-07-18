import { describe, expect, it } from "vitest";
import { summarizeCommercialStoreRows } from "@/lib/collection/adapters/commercial-store";
import { summarizeEstimatedSales } from "@/lib/collection/adapters/estimated-sales";
import { summarizeMonthlyRent } from "@/lib/collection/adapters/rental-transaction";
import { quarterEndDate, recentQuarterCodes } from "@/lib/collection/quarter";

describe("market indicator calculations", () => {
  it("aggregates opening and closing rates from official counts", () => {
    const result = summarizeCommercialStoreRows([
      { STDR_YYQU_CD: "20261", ADSTRD_CD: "11530595", ADSTRD_CD_NM: "가리봉동", SVC_INDUTY_CD: "A", SVC_INDUTY_CD_NM: "업종A", SIMILR_INDUTY_STOR_CO: 60, OPBIZ_RT: 5, OPBIZ_STOR_CO: 3, CLSBIZ_RT: 10, CLSBIZ_STOR_CO: 6 },
      { STDR_YYQU_CD: "20261", ADSTRD_CD: "11530595", ADSTRD_CD_NM: "가리봉동", SVC_INDUTY_CD: "B", SVC_INDUTY_CD_NM: "업종B", SIMILR_INDUTY_STOR_CO: 40, OPBIZ_RT: 5, OPBIZ_STOR_CO: 2, CLSBIZ_RT: 5, CLSBIZ_STOR_CO: 2 },
    ]);
    expect(result).toEqual({ storeCount: 100, openedCount: 5, closedCount: 8, openingRate: 5, closingRate: 8 });
  });

  it("uses the latest contract month and monthly-rent median", () => {
    const base = { RCPT_YR: "2026", CGG_CD: "11530", STDG_CD: "10300", STDG_NM: "가리봉동", RENT_SE: "월세" };
    const result = summarizeMonthlyRent([
      { ...base, CTRT_DAY: "20260630", RTFE: 30 },
      { ...base, CTRT_DAY: "20260701", RTFE: 40 },
      { ...base, CTRT_DAY: "20260702", RTFE: 60 },
      { ...base, CTRT_DAY: "20260703", RENT_SE: "전세", RTFE: 0 },
    ]);
    expect(result).toEqual({ latestMonth: "202607", latestContractDate: "20260702", sampleCount: 2, median: 50 });
  });

  it("sums monthly estimated sales and formats quarter dates", () => {
    const rows = [
      { STDR_YYQU_CD: "20261", ADSTRD_CD: "11530595", ADSTRD_CD_NM: "가리봉동", SVC_INDUTY_CD: "A", SVC_INDUTY_CD_NM: "업종A", THSMON_SELNG_AMT: 100 },
      { STDR_YYQU_CD: "20261", ADSTRD_CD: "11530595", ADSTRD_CD_NM: "가리봉동", SVC_INDUTY_CD: "B", SVC_INDUTY_CD_NM: "업종B", THSMON_SELNG_AMT: 250 },
    ];
    expect(summarizeEstimatedSales(rows)).toBe(350);
    expect(recentQuarterCodes(new Date("2026-07-18T00:00:00Z"), 2)).toEqual(["20262", "20261"]);
    expect(quarterEndDate("20261")).toBe("2026-03-31");
  });
});
