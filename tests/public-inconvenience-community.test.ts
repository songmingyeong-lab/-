import { describe, expect, it } from "vitest";
import { summarizePublicServiceReservations } from "@/lib/collection/adapters/public-service-reservation";
import { summarizeRoadExcavationDurations } from "@/lib/collection/adapters/road-excavation";

describe("public inconvenience and community indicators", () => {
  it("averages inclusive road-excavation periods after permit-period deduplication", () => {
    const rows = [
      { PRMISN_REQ_NO: "A", ATDRC_ID: "구로구", ADSTRD_CD: "가리봉동", CNW_NM: "공사 A", CNWPD_DT: "2026-01-01 ~ 2026-01-03", PRCS_STTUS_SE: "허가증 교부" },
      { PRMISN_REQ_NO: "A", ATDRC_ID: "구로구", ADSTRD_CD: "가리봉동", CNW_NM: "공사 A 중복", CNWPD_DT: "2026-01-01 ~ 2026-01-03", PRCS_STTUS_SE: "허가증 교부" },
      { PRMISN_REQ_NO: "B", ATDRC_ID: "구로구", ADSTRD_CD: "가리봉동", CNW_NM: "공사 B", CNWPD_DT: "2026-01-10 ~ 2026-01-14", PRCS_STTUS_SE: "착공계 접수" },
      { PRMISN_REQ_NO: "C", ATDRC_ID: "구로구", ADSTRD_CD: "구로동", CNW_NM: "제외", CNWPD_DT: "2026-01-01 ~ 2026-01-31", PRCS_STTUS_SE: "착공계 접수" },
    ];

    expect(summarizeRoadExcavationDurations(rows, "구로구", "가리봉동")).toEqual({
      rawCount: 3,
      uniqueCount: 2,
      parsedCount: 2,
      averageDays: 4,
      latestEndDate: "2026-01-14",
    });
  });

  it("counts all Garibong reservation services and unique sports/public-space places without an urban-regeneration filter", () => {
    const base = { MINCLASSNM: "", SVCSTATNM: "접수중", DTLCONT: "가리봉동 주민 대상" };
    const rows = [
      { ...base, SVCID: "P1", MAXCLASSNM: "교육강좌", SVCNM: "일반 강좌", PLACENM: "가리봉 강의실", AREANM: "구로구" },
      { ...base, SVCID: "P2", MAXCLASSNM: "체육시설", SVCNM: "체육 예약", PLACENM: "가리봉 체육관", AREANM: "구로구" },
      { ...base, SVCID: "P3", MAXCLASSNM: "공간시설", SVCNM: "회의실 예약", PLACENM: "가리봉 공공공간", AREANM: "구로구" },
      { ...base, SVCID: "P4", MAXCLASSNM: "공간시설", SVCNM: "회의실 다른 회차", PLACENM: "가리봉 공공공간", AREANM: "구로구" },
      { ...base, SVCID: "X", MAXCLASSNM: "체육시설", SVCNM: "다른 지역", PLACENM: "다른 체육관", AREANM: "금천구", DTLCONT: "가리봉 역사 탐방" },
    ];

    expect(summarizePublicServiceReservations(rows, "구로구", "가리봉동")).toEqual({
      districtRows: 4,
      matchedRows: 4,
      programCount: 4,
    });
  });
});
