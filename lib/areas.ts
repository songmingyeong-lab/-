import areas from "@/data/target-areas.json";

export interface TargetArea {
  slug: string;
  cityName: string;
  districtName: string;
  dongName: string;
  administrativeDongName: string;
  administrativeDongCode: string;
  legalDongName: string;
  legalDongCode: string;
  codeStatus: string;
  codeVerifiedAt: string;
  codeVerificationEvidence: string;
  boundaryType: string;
  projectName: string;
  projectType: string;
  projectStartDate: string;
  projectEndDate: string;
  projectDatePrecision: string;
  scopeDescription: string;
  officialProjectSource: string;
  officialCodeSource: string;
  memberAreaSlugs?: readonly string[];
}

export const collectionTargetAreas: TargetArea[] = areas;
export const CHANGSIN_SUNGIN_SLUG = "changsin-sungin";
export const compositeTargetArea: TargetArea = {
  slug: CHANGSIN_SUNGIN_SLUG,
  cityName: "서울특별시",
  districtName: "종로구",
  dongName: "창신·숭인",
  administrativeDongName: "창신·숭인",
  administrativeDongCode: "11110-COMPOSITE",
  legalDongName: "창신동·숭인동",
  legalDongCode: "1111017400+1111017500",
  codeStatus: "COMPOSITE_OF_VERIFIED_ADMINISTRATIVE_DONGS",
  codeVerifiedAt: "2026-07-27",
  codeVerificationEvidence: "창신1동·창신2동·창신3동·숭인1동 공식 행정동 코드의 통합 집계",
  boundaryType: "COMPOSITE_ADMINISTRATIVE_DONGS",
  projectName: "창신·숭인 도시재생선도사업",
  projectType: "도시재생선도지역",
  projectStartDate: "2014-05-07",
  projectEndDate: "2017-12-31",
  projectDatePrecision: "START_DATE_VERIFIED_END_YEAR_ONLY",
  scopeDescription: "창신1·2·3동 및 숭인1동 통합 집계입니다. 행정동 집계 대체지표이며 도시재생구역의 정밀 경계값은 아닙니다.",
  officialProjectSource: "https://news.seoul.go.kr/citybuild/archives/40434",
  officialCodeSource: "https://golmok.seoul.go.kr/images/adstrd_code.pdf",
  memberAreaSlugs: ["changsin-1", "changsin-2", "changsin-3", "sungin-1"],
};
export const targetAreas: TargetArea[] = [...collectionTargetAreas, compositeTargetArea];
export type TargetAreaSlug = string;

export const DEFAULT_AREA_SLUG = "garibong";

export function getTargetArea(slug?: string | null) {
  return targetAreas.find((area) => area.slug === slug);
}

export function resolveTargetArea(slug?: string | null) {
  return getTargetArea(slug) ?? getTargetArea(DEFAULT_AREA_SLUG)!;
}

export function isTargetAreaSlug(slug: string): slug is TargetAreaSlug {
  return Boolean(getTargetArea(slug));
}

export function isCompositeTargetArea(area: TargetArea) {
  return Boolean(area.memberAreaSlugs?.length);
}
