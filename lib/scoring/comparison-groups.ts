import type { ComparableAreaValue } from "@/lib/scoring/types";

export function excludeTargetDong(values: ComparableAreaValue[], targetDongCode: string) {
  if (!targetDongCode) throw new Error("가리봉동 공식 행정동 코드가 없습니다.");
  return values.filter((value) => value.areaCode !== targetDongCode);
}

export function excludeTargetDistrict(values: ComparableAreaValue[], targetDistrictCode: string) {
  if (!targetDistrictCode) throw new Error("구로구 공식 자치구 코드가 없습니다.");
  return values.filter((value) => value.areaCode !== targetDistrictCode);
}

export function validateComparableObservations(target: ComparableAreaValue, values: ComparableAreaValue[]) {
  return values.filter((value) =>
    value.value !== null
    && Number.isFinite(value.value)
    && value.geographicUnit === target.geographicUnit
    && value.basePeriod === target.basePeriod
    && value.unit === target.unit,
  );
}

export function buildGuroDongComparisonGroup(values: ComparableAreaValue[], targetDongCode: string, guroDistrictCode: string) {
  if (!guroDistrictCode) throw new Error("구로구 공식 자치구 코드가 없습니다.");
  const target = values.find((value) => value.areaCode === targetDongCode);
  if (!target) throw new Error("가리봉동 대상값이 없습니다.");
  if (target.geographicUnit !== "ADMINISTRATIVE_DONG" && target.geographicUnit !== "LEGAL_DONG") throw new Error("동 단위 비교에 자치구 자료가 입력되었습니다.");
  const guroValues = values.filter((value) => value.districtCode === guroDistrictCode && value.geographicUnit === target.geographicUnit);
  return { target, comparisons: validateComparableObservations(target, excludeTargetDong(guroValues, targetDongCode)) };
}

export function buildSeoulDistrictComparisonGroup(values: ComparableAreaValue[], targetDistrictCode: string) {
  const target = values.find((value) => value.areaCode === targetDistrictCode);
  if (!target) throw new Error("구로구 대상값이 없습니다.");
  if (target.geographicUnit !== "DISTRICT") throw new Error("자치구 비교에 다른 공간단위가 입력되었습니다.");
  const seoulValues = values.filter((value) => value.cityCode === "11" && value.geographicUnit === "DISTRICT");
  return { target, comparisons: validateComparableObservations(target, excludeTargetDistrict(seoulValues, targetDistrictCode)) };
}

export function formatComparisonScope(scope: "GURO_DONG" | "SEOUL_DISTRICT" | "INFORMATION_ONLY") {
  if (scope === "GURO_DONG") return "가리봉동 대 구로구 다른 행정동";
  if (scope === "SEOUL_DISTRICT") return "구로구 대 서울시 다른 자치구";
  return "정보 제공용 지표";
}
