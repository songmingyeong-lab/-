import "../envConfig";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, FavorableDirection, IndicatorArea, ObservationStatus } from "../generated/prisma/client";
import areas from "../data/target-areas.json";
import { getDatabaseUrl } from "../lib/validation/env";

// Prefer the direct/session connection for Supabase maintenance work. Local
// PostgreSQL remains compatible by providing only DATABASE_URL.
const connectionString = getDatabaseUrl("maintenance");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const sources = [
  { code: "living-population", name: "행정동 단위 서울 생활인구(내국인)", serviceId: "OA-14991", serviceName: "SPOP_LOCAL_RESD_DONG", sourceUrl: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CODE_SE" },
  { code: "building-register", name: "서울시 건축물대장 총괄표제부", serviceId: "OA-22423", serviceName: "vBigDjrRecapTitle", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "monthly", geographicUnit: "legal_dong", codeType: "legal", filterField: "SGG_CD_NM,STDG_CD_NM" },
  { code: "commercial-store", name: "서울시 상권분석서비스(점포-행정동)", serviceId: "OA-22172", serviceName: "VwsmAdstrdStorW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "floating-population", name: "서울시 상권분석서비스(길단위인구-행정동)", serviceId: "OA-22178", serviceName: "VwsmAdstrdFlpopW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "vacant-house", name: "서울특별시 구로구 빈집 현황", serviceId: "15127329", serviceName: null, sourceUrl: "https://www.data.go.kr/data/15127329/fileData.do?recommendDataYn=Y", updateCycle: "yearly", collectionCycle: "quarterly", geographicUnit: "published_rows", codeType: "address_or_aggregate", filterField: null },
  { code: "road-construction", name: "서울시 도로굴착 공사 현황", serviceId: "OA-22901", serviceName: "TnCnwInfoView", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22901/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "administrative_dong", codeType: "name", filterField: "ATDRC_ID,ADSTRD_CD,CNWPD_DT" },
  { code: "noise-complaint", name: "서울시 소음진동민원 현황 통계", serviceId: "DT201004J030005", serviceName: null, sourceUrl: "https://data.seoul.go.kr/dataList/DT201004J030005/S/2/datasetView.do", updateCycle: "yearly", collectionCycle: "monthly", geographicUnit: "city_or_district", codeType: "aggregate", filterField: null },
  { code: "rental-transaction", name: "서울시 부동산 전월세가 정보", serviceId: "OA-21276", serviceName: "tbLnOpendataRentV", sourceUrl: "https://data.seoul.go.kr/dataList/OA-21276/S/1/datasetView.do", updateCycle: "realtime", collectionCycle: "monthly", geographicUnit: "legal_dong", codeType: "legal", filterField: "CGG_CD,STDG_CD,STDG_NM" },
  { code: "estimated-sales", name: "서울시 상권분석서비스(추정매출-행정동)", serviceId: "OA-22175", serviceName: "VwsmAdstrdSelngW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD,ADSTRD_CD_NM" },
  { code: "public-program", name: "서울시 공공서비스예약(종합) 정보", serviceId: "OA-20497", serviceName: "tvYeyakCOllect", sourceUrl: "https://data.seoul.go.kr/dataList/OA-20497/S/1/datasetView.do?tab=A", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "district_and_dong_text", codeType: "name_or_description", filterField: "AREANM,PLACENM,SVCNM,DTLCONT,MAXCLASSNM" },
  { code: "facility-registry", name: "서울시 공공서비스예약(종합) 정보", serviceId: "OA-20497", serviceName: "tvYeyakCOllect", sourceUrl: "https://data.seoul.go.kr/dataList/OA-20497/S/1/datasetView.do?tab=A", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "district_and_dong_text", codeType: "name_or_description", filterField: "AREANM,PLACENM,SVCNM,DTLCONT,MAXCLASSNM" },
];

const indicators = [
  { code: "aged_building_ratio", sourceCode: "building-register", name: "총괄표제부 기준 30년 이상 건축물 비율", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "가리봉동 총괄표제부 중 사용승인일 확인 건을 분모로 하여 수집 기준일 30년 이상 비율 계산", comparison: "구로구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "총괄표제부는 같은 부지에 표제부가 2개 이상인 경우 생성되므로 가리봉동 전체 건축물을 대표하지 않습니다.", proxy: "총괄표제부가 생성된 대지 중 사용승인일 확인 건의 노후 비율이며 가리봉동의 모든 개별 건축물을 포함하는 비율은 아닙니다." },
  { code: "vacant_house_count", sourceCode: "vacant-house", name: "확인된 빈집 수", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "호", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "공식 빈집 조사자료의 가리봉동 집계", comparison: "previous_period", stale: 365, defaultStatus: ObservationStatus.MANUAL_VERIFICATION_REQUIRED, statusMessage: "공공데이터포털 구로구 빈집현황의 가리봉동 지원 여부와 공개 단위를 확인해야 합니다.", proxy: "건축물대장만으로 실제 빈집 여부를 판정하지 않습니다." },
  { code: "road_excavation_active_count", sourceCode: "road-construction", name: "도로굴착 평균 기간", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "일", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "가리봉동 전체 공개 이력에서 허가번호·공사기간 중복 제거 후 시작일과 종료일을 포함한 예정기간 산술평균", comparison: "구로구 다른 동 명칭기반 평균", stale: 2, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "공사별 예정기간의 평균이며 실제 작업일수, 현재 진행 건수 또는 주민 체감 불편을 직접 뜻하지 않습니다." },
  { code: "noise_vibration_complaint_count", sourceCode: "noise-complaint", name: "소음·진동 민원(구로구)", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "건", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "가리봉동 세부값이 없어 구로구 전체 공식 통계를 대체값으로 표시", comparison: "동일 자치구 비교자료 확보 전 임시 중립점수", stale: 400, defaultStatus: ObservationStatus.UNSUPPORTED_GEOGRAPHY, statusMessage: "가리봉동 값이 아니라 구로구 전체 값임을 명시해 사용합니다.", proxy: "구로구 전체의 신고 접근성·신고 성향·반복 신고 영향을 받는 대체지표이며 가리봉동의 민원 수가 아닙니다." },
  { code: "store_count", sourceCode: "commercial-store", name: "전체 점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서비스 업종별 전체 점포 수 합계", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "행정동 상권 규모 변화" },
  { code: "opening_rate", sourceCode: "commercial-store", name: "개업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "업종별 OPBIZ_STOR_CO 합계 / SIMILR_INDUTY_STOR_CO 합계 × 100", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "점포 진입 변화를 보여주며 상권 개선을 직접 뜻하지 않습니다." },
  { code: "closing_rate", sourceCode: "commercial-store", name: "폐업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "업종별 CLSBIZ_STOR_CO 합계 / SIMILR_INDUTY_STOR_CO 합계 × 100", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "점포 이탈 변화를 보여주며 주민 불편이나 사업 성패를 직접 뜻하지 않습니다." },
  { code: "median_monthly_rent", sourceCode: "rental-transaction", name: "주거 월세 중위값", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "만원", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "가리봉동 법정동의 최신 계약월 월세 거래 중 RTFE가 0보다 큰 자료의 중위값", comparison: "구로구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "가리봉동 주거용 월세 계약의 공개 표본이며 상가 임대료나 전체 임대주택 시세를 뜻하지 않습니다." },
  { code: "estimated_sales", sourceCode: "estimated-sales", name: "점포당 추정매출", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "원/점포", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "행정동 업종별 THSMON_SELNG_AMT 합계 / 같은 분기 전체 점포 수", comparison: "구로구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석 모형의 점포당 추정치이며 실제 신고매출이나 주민 소득을 뜻하지 않습니다." },
  { code: "living_population", sourceCode: "living-population", name: "일평균 생활인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "24개 시간대 산술평균", comparison: "previous_month", stale: 3, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "지역에 머문 인구 규모의 변화" },
  { code: "floating_population", sourceCode: "floating-population", name: "총 유동인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서울 상권분석 제공값", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "시간대별 지역 활동량" },
  { code: "peak_floating_time_band", sourceCode: "floating-population", name: "최대 집중 시간대 유동인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명", direction: FavorableDirection.NEUTRAL, aggregation: "6개 시간대 유동인구 중 최대값과 해당 시간대", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "시간대별 유동인구 집중을 나타내며 면적 기준 혼잡도를 뜻하지 않습니다." },
  { code: "resident_program_count", sourceCode: "public-program", name: "주민참여 프로그램", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "건", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "서울시 공공서비스예약 중 구로구 전체의 고유 예약서비스 집계(도시재생 관련성과 가리봉동 소재 여부 미적용)", comparison: "서울시 다른 자치구 명칭기반 평균", stale: 2, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "구로구 전체 공공서비스예약 등록 건수이며 실제 참여인원, 주민 주도성 또는 프로그램 성과를 뜻하지 않습니다." },
  { code: "urban_regeneration_hub_count", sourceCode: "building-register", name: "거점시설 수", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "개", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "가리봉동 법정동 총괄표제부 주용도코드명 중 교육연구및복지시설과 문화및집회시설 건수 합계", comparison: "구로구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "총괄표제부 주용도코드명으로 분류한 시설 수이며 실제 거점 기능, 운영 여부 또는 이용 가능 여부를 뜻하지 않습니다." },
];

async function main() {
  const area = areas[0];
  await prisma.area.upsert({
    where: { slug: area.slug },
    update: {
      cityName: area.cityName, districtName: area.districtName, dongName: area.dongName,
      administrativeDongName: area.administrativeDongName, administrativeDongCode: area.administrativeDongCode,
      legalDongName: area.legalDongName, legalDongCode: area.legalDongCode,
      projectName: area.projectName, projectType: area.projectType, boundaryType: area.boundaryType,
      codeSourceUrl: area.officialCodeSource, codeVerifiedAt: new Date(area.codeVerifiedAt),
    },
    create: {
      slug: area.slug, cityName: area.cityName, districtName: area.districtName, dongName: area.dongName,
      administrativeDongName: area.administrativeDongName, administrativeDongCode: area.administrativeDongCode,
      legalDongName: area.legalDongName, legalDongCode: area.legalDongCode,
      projectName: area.projectName, projectType: area.projectType, projectStartDate: new Date(area.projectStartDate), projectEndDate: new Date(area.projectEndDate),
      boundaryType: area.boundaryType, codeSourceUrl: area.officialCodeSource, codeVerifiedAt: new Date(area.codeVerifiedAt),
      metadata: { codeStatus: area.codeStatus, codeVerificationEvidence: area.codeVerificationEvidence, projectDatePrecision: area.projectDatePrecision, scopeDescription: area.scopeDescription, officialProjectSource: area.officialProjectSource },
    },
  });
  for (const source of sources) {
    const enabled = ["living-population", "building-register", "commercial-store", "floating-population", "rental-transaction", "estimated-sales", "road-construction", "public-program"].includes(source.code);
    await prisma.dataSource.upsert({
      where: { code: source.code }, update: { ...source, enabled, config: { verificationRequired: !enabled } },
      create: { ...source, provider: "공공기관", responseFormat: "json", enabled, config: { verificationRequired: !enabled } },
    });
  }
  for (const item of indicators) {
    const source = await prisma.dataSource.findUniqueOrThrow({ where: { code: item.sourceCode } });
    await prisma.indicatorDefinition.upsert({
      where: { code: item.code },
      update: { name: item.name, category: item.category, areaGroup: item.areaGroup, unit: item.unit, description: item.proxy, favorableDirection: item.direction, sourceId: source.id, proxyDescription: item.proxy, aggregationMethod: item.aggregation, comparisonPeriod: item.comparison, geographicUnit: source.geographicUnit, staleAfterDays: item.stale, defaultStatus: item.defaultStatus, statusMessage: item.statusMessage, active: true },
      create: { code: item.code, name: item.name, category: item.category, areaGroup: item.areaGroup, unit: item.unit, description: item.proxy, favorableDirection: item.direction, sourceId: source.id, proxyDescription: item.proxy, aggregationMethod: item.aggregation, comparisonPeriod: item.comparison, geographicUnit: source.geographicUnit, staleAfterDays: item.stale, defaultStatus: item.defaultStatus, statusMessage: item.statusMessage, active: true },
    });
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
