import "../envConfig";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, FavorableDirection, IndicatorArea, ObservationStatus } from "../generated/prisma/client";
import areas from "../data/target-areas.json";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL이 필요합니다.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const sources = [
  { code: "living-population", name: "행정동 단위 서울 생활인구(내국인)", serviceId: "OA-14991", serviceName: "SPOP_LOCAL_RESD_DONG", sourceUrl: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CODE_SE" },
  { code: "building-register", name: "서울시 건축물대장 총괄표제부", serviceId: "OA-22423", serviceName: null, sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "monthly", geographicUnit: "legal_dong", codeType: "legal", filterField: null },
  { code: "commercial-store", name: "서울시 상권분석서비스(점포-행정동)", serviceId: "OA-22172", serviceName: "VwsmAdstrdStorW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "floating-population", name: "서울시 상권분석서비스(길단위인구-행정동)", serviceId: "OA-22178", serviceName: "VwsmAdstrdFlpopW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "vacant-house", name: "공공데이터포털 구로구 빈집현황 (명세 확인 필요)", serviceId: null, serviceName: null, sourceUrl: "https://www.data.go.kr/", updateCycle: "irregular", collectionCycle: "quarterly", geographicUnit: "published_unit_pending", codeType: "address_or_aggregate", filterField: null },
  { code: "road-construction", name: "서울시·구로구 도로굴착 공개자료 (명세 확인 필요)", serviceId: null, serviceName: null, sourceUrl: "https://data.seoul.go.kr/", updateCycle: "pending", collectionCycle: "daily", geographicUnit: "address", codeType: "address", filterField: null },
  { code: "noise-complaint", name: "서울시·구로구 소음·진동 민원 집계자료 (공개범위 확인 필요)", serviceId: null, serviceName: null, sourceUrl: "https://data.seoul.go.kr/", updateCycle: "pending", collectionCycle: "monthly", geographicUnit: "published_unit_pending", codeType: "aggregate", filterField: null },
  { code: "rental-transaction", name: "국토교통부 임대차 실거래 공개자료 (상가·공간단위 확인 필요)", serviceId: null, serviceName: null, sourceUrl: "https://www.data.go.kr/", updateCycle: "monthly", collectionCycle: "monthly", geographicUnit: "address", codeType: "legal_or_address", filterField: null },
  { code: "estimated-sales", name: "서울시 상권분석서비스 추정매출-행정동 (명세 확인 필요)", serviceId: null, serviceName: null, sourceUrl: "https://data.seoul.go.kr/", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "public-program", name: "서울시·구로구 공공서비스예약 및 프로그램 공개자료", serviceId: null, serviceName: null, sourceUrl: "https://yeyak.seoul.go.kr/", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "address", codeType: "address", filterField: null },
  { code: "facility-registry", name: "가리봉 도시재생 거점시설 검수 목록", serviceId: null, serviceName: null, sourceUrl: "https://www.guro.go.kr/", updateCycle: "manual", collectionCycle: "quarterly", geographicUnit: "facility", codeType: "address", filterField: null },
];

const indicators = [
  { code: "aged_building_ratio", sourceCode: "building-register", name: "30년 이상 노후건축물 비율", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "기준일과 사용승인일의 실제 차이로 계산", comparison: "previous_year", stale: 45, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "건축물 자료원의 대표성과 법정동 조회 조건을 확인 중입니다.", proxy: "노후 주거환경의 구조적 상태를 보는 보조지표이며 위험건축물을 뜻하지 않습니다." },
  { code: "vacant_house_count", sourceCode: "vacant-house", name: "확인된 빈집 수", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "호", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "공식 빈집 조사자료의 가리봉동 집계", comparison: "previous_period", stale: 365, defaultStatus: ObservationStatus.MANUAL_VERIFICATION_REQUIRED, statusMessage: "공공데이터포털 구로구 빈집현황의 가리봉동 지원 여부와 공개 단위를 확인해야 합니다.", proxy: "건축물대장만으로 실제 빈집 여부를 판정하지 않습니다." },
  { code: "road_excavation_active_count", sourceCode: "road-construction", name: "진행 중 도로굴착 공사", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "건", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "주소 정규화 후 가리봉동 포함 진행 건 집계", comparison: "previous_month", stale: 2, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "공식 API 서비스명과 주소·공사기간·상태 필드를 확인해야 합니다.", proxy: "이동 불편 가능성과 기반시설 개선 활동을 함께 살펴보는 보조지표입니다." },
  { code: "noise_vibration_complaint_count", sourceCode: "noise-complaint", name: "소음·진동 민원", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "건", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "민원 원문 없이 분류코드와 월별 집계값 사용", comparison: "previous_month", stale: 45, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "가리봉동 공개 여부와 개인정보·민감정보 제한을 확인해야 합니다.", proxy: "신고 접근성·신고 성향·반복 신고의 영향을 받는 불편 가능성 지표입니다." },
  { code: "store_count", sourceCode: "commercial-store", name: "전체 점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서비스 업종별 전체 점포 수 합계", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "행정동 상권 규모 변화" },
  { code: "opening_rate", sourceCode: "commercial-store", name: "개업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서울 상권분석 제공 개업률의 정의 확인 후 적용", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "개업률 필드 정의와 집계 방식을 확인해야 합니다.", proxy: "점포 진입 변화를 보여주며 상권 개선을 직접 뜻하지 않습니다." },
  { code: "closing_rate", sourceCode: "commercial-store", name: "폐업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서울 상권분석 제공 폐업률의 정의 확인 후 적용", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "폐업률 필드 정의와 집계 방식을 확인해야 합니다.", proxy: "점포 이탈 변화를 보여주며 주민 불편이나 사업 성패를 직접 뜻하지 않습니다." },
  { code: "median_monthly_rent", sourceCode: "rental-transaction", name: "월세 중위값", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "만원", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "월세 거래만 분리해 중위값 산출", comparison: "previous_month", stale: 45, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "상가 임대차 구분과 가리봉동 주소 필터 가능 여부를 확인해야 합니다.", proxy: "공개된 거래 표본의 임대료 수준이며 거래가 없는 달은 0이 아닙니다." },
  { code: "estimated_sales", sourceCode: "estimated-sales", name: "분기 추정매출", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "원", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "행정동 업종별 추정매출 합계", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "실제 서비스명과 매출 필드 정의를 확인해야 합니다.", proxy: "모형 기반 추정치이며 실제 전체 매출이나 주민 소득을 뜻하지 않습니다." },
  { code: "living_population", sourceCode: "living-population", name: "일평균 생활인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "24개 시간대 산술평균", comparison: "previous_month", stale: 3, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "지역에 머문 인구 규모의 변화" },
  { code: "floating_population", sourceCode: "floating-population", name: "총 유동인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서울 상권분석 제공값", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "시간대별 지역 활동량" },
  { code: "peak_floating_time_band", sourceCode: "floating-population", name: "최대 집중 시간대", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "시간대", direction: FavorableDirection.NEUTRAL, aggregation: "시간대별 유동인구 중 최대 구간", comparison: "previous_quarter", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "시간대별 유동인구 집중을 나타내며 면적 기준 혼잡도를 뜻하지 않습니다." },
  { code: "resident_program_count", sourceCode: "public-program", name: "주민참여 프로그램", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "건", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "주소와 도시재생 연관성 검증 후 월별 프로그램 집계", comparison: "previous_month", stale: 14, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "공식 관리 파일이 없어 공개 예약·행사 자료의 가리봉동 관련성을 검증해야 합니다.", proxy: "프로그램 수는 공동체 회복이나 실제 참여인원을 직접 뜻하지 않습니다." },
  { code: "urban_regeneration_hub_count", sourceCode: "facility-registry", name: "확인된 도시재생 거점시설", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "개", direction: FavorableDirection.NEUTRAL, aggregation: "공식 목록 또는 근거자료와 수동 검수로 확인된 시설 집계", comparison: "none", stale: 365, defaultStatus: ObservationStatus.MANUAL_VERIFICATION_REQUIRED, statusMessage: "공식 시설 목록과 사업보고서가 없어 시설을 임의로 판정하지 않습니다.", proxy: "시설 수는 이용자 수, 운영 활성화 또는 도시재생 성공을 직접 뜻하지 않습니다." },
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
    await prisma.dataSource.upsert({
      where: { code: source.code }, update: source,
      create: { ...source, provider: "공공기관", responseFormat: "json", enabled: ["living-population", "commercial-store", "floating-population"].includes(source.code), config: { verificationRequired: !["living-population", "commercial-store", "floating-population"].includes(source.code) } },
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

main().finally(() => prisma.$disconnect());
