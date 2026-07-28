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
  { code: "commercial-store", name: "서울시 상권분석서비스 지역별 현황(조건검색)", serviceId: "GOLMOK-REGION-STORE", serviceName: "selectStoreCount.json", sourceUrl: "https://golmok.seoul.go.kr/stateArea.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "CD" },
  { code: "commercial-opening-market", name: "서울시 상권분석서비스 지역별 현황(개폐업률 조건검색)", serviceId: null, serviceName: "selectOpening.json", sourceUrl: "https://golmok.seoul.go.kr/stateArea.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "stdrSigngu,CD" },
  { code: "commercial-rent-market", name: "서울시 상권분석서비스 지역별 현황(임대시세 조건검색)", serviceId: null, serviceName: "selectRentalPrice.json", sourceUrl: "https://golmok.seoul.go.kr/stateArea.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "stdrSigngu,GBN_CD" },
  { code: "income-consumption", name: "서울시 상권분석서비스 지역별 현황(소득 조건검색)", serviceId: null, serviceName: "selectIncome.json", sourceUrl: "https://golmok.seoul.go.kr/stateArea.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "stdrSigngu,CD" },
  { code: "resident-population", name: "서울시 상권분석서비스(상주인구-행정동)", serviceId: "OA-22183", serviceName: "VwsmAdstrdRepopW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "floating-population", name: "서울시 상권분석서비스 지역별 현황(길 단위 유동인구 조건검색)", serviceId: null, serviceName: "selectPopulation.json", sourceUrl: "https://golmok.seoul.go.kr/stateArea.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "stdrSigngu,CD" },
  { code: "vacant-house", name: "빈집애(REB) 빈집지도", serviceId: null, serviceName: "apihome/state/list", sourceUrl: "https://www.binzibe.kr/main/html/map.html", updateCycle: "yearly", collectionCycle: "quarterly", geographicUnit: "legal_dong_proxy", codeType: "legal_dong_name", filterField: "year,reg,sojaeji" },
  { code: "road-construction", name: "서울시 도로굴착 공사 현황", serviceId: "OA-22901", serviceName: "TnCnwInfoView", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22901/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "administrative_dong", codeType: "name", filterField: "ATDRC_ID,ADSTRD_CD,CNWPD_DT" },
  { code: "noise-complaint", name: "서울시 소음진동민원 현황 통계", serviceId: "DT201004J030005", serviceName: null, sourceUrl: "https://data.seoul.go.kr/dataList/DT201004J030005/S/2/datasetView.do", updateCycle: "yearly", collectionCycle: "monthly", geographicUnit: "city_or_district", codeType: "aggregate", filterField: null },
  { code: "rental-transaction", name: "서울시 부동산 전월세가 정보", serviceId: "OA-21276", serviceName: "tbLnOpendataRentV", sourceUrl: "https://data.seoul.go.kr/dataList/OA-21276/S/1/datasetView.do", updateCycle: "realtime", collectionCycle: "monthly", geographicUnit: "legal_dong", codeType: "legal", filterField: "CGG_CD,STDG_CD,STDG_NM" },
  { code: "estimated-sales", name: "서울시 상권분석서비스(추정매출-행정동)", serviceId: "OA-22175", serviceName: "VwsmAdstrdSelngW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD,ADSTRD_CD_NM" },
  { code: "public-program", name: "서울시 공공서비스예약(종합) 정보", serviceId: "OA-20497", serviceName: "tvYeyakCOllect", sourceUrl: "https://data.seoul.go.kr/dataList/OA-20497/S/1/datasetView.do?tab=A", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "district_and_dong_text", codeType: "name_or_description", filterField: "AREANM,PLACENM,SVCNM,DTLCONT,MAXCLASSNM" },
  { code: "facility-registry", name: "서울시 공공서비스예약(종합) 정보", serviceId: "OA-20497", serviceName: "tvYeyakCOllect", sourceUrl: "https://data.seoul.go.kr/dataList/OA-20497/S/1/datasetView.do?tab=A", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "district_and_dong_text", codeType: "name_or_description", filterField: "AREANM,PLACENM,SVCNM,DTLCONT,MAXCLASSNM" },
];

const indicators = [
  { code: "aged_building_ratio", sourceCode: "building-register", name: "총괄표제부 기준 30년 이상 건축물 비율", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "대상 법정동 총괄표제부 중 사용승인일 확인 건을 분모로 하여 수집 기준일 30년 이상 비율 계산", comparison: "같은 자치구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.UNVERIFIED, statusMessage: "총괄표제부는 같은 부지에 표제부가 2개 이상인 경우 생성되므로 대상 지역 전체 건축물을 대표하지 않습니다.", proxy: "총괄표제부가 생성된 대지 중 사용승인일 확인 건의 노후 비율이며 모든 개별 건축물을 포함하는 비율은 아닙니다." },
  { code: "vacant_house_count", sourceCode: "vacant-house", name: "빈집 수", category: "주거환경", areaGroup: IndicatorArea.HOUSING_ENVIRONMENT, unit: "호", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "빈집애 공개 AJAX의 조사연도별 법정동 binCnt", comparison: "같은 자치구 다른 법정동 평균(행정동 독립값 미제공 시 법정동 대체)", stale: 400, defaultStatus: ObservationStatus.EMPTY, statusMessage: "지자체 빈집행정조사 기반 단순 수량 정보이며 국가승인통계가 아닙니다.", proxy: "법정동 단위 빈집행정조사 집계이며 주민 만족도나 도시재생사업 효과를 직접 측정하지 않습니다." },
  { code: "road_excavation_active_count", sourceCode: "road-construction", name: "도로굴착 평균 기간", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "일", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "대상 법정동 전체 공개 이력에서 허가번호·공사기간 중복 제거 후 시작일과 종료일을 포함한 예정기간 산술평균", comparison: "같은 자치구 다른 법정동 명칭기반 평균", stale: 2, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "공사별 예정기간의 평균이며 실제 작업일수, 현재 진행 건수 또는 주민 체감 불편을 직접 뜻하지 않습니다. 행정동과 법정동이 다르면 법정동 전체 대체값입니다." },
  { code: "noise_vibration_complaint_count", sourceCode: "noise-complaint", name: "소음·진동 민원(자치구)", category: "생활 불편", areaGroup: IndicatorArea.LIVING_INCONVENIENCE, unit: "건", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "행정동 세부값이 없어 해당 자치구 전체 공식 통계를 대체값으로 표시", comparison: "동일 자치구 비교자료 확보 전 임시 중립점수", stale: 400, defaultStatus: ObservationStatus.UNSUPPORTED_GEOGRAPHY, statusMessage: "행정동 값이 아니라 자치구 전체 값임을 명시해 사용합니다.", proxy: "자치구 전체의 신고 접근성·신고 성향·반복 신고 영향을 받는 대체지표이며 해당 행정동의 민원 수가 아닙니다." },
  { code: "store_density", sourceCode: "commercial-store", name: "1,000가구당 점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개/1,000가구", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "행정동 전체 점포 수 / 같은 기준분기 총 가구 수 × 1,000(면적 미확보 시 허용된 대체식)", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "지역 면적 대신 가구 수로 정규화한 점포 분포 대체지표이며 물리적 면적 밀도와 동일하지 않습니다." },
  { code: "store_count", sourceCode: "commercial-store", name: "점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개", direction: FavorableDirection.NEUTRAL, aggregation: "당기 운영 점포 수와 당기 폐업 점포 수를 포함한 업종별 전체 점포 수 합계", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "점수에 직접 반영하지 않는 상권 규모 원자료입니다." },
  { code: "opening_count", sourceCode: "commercial-opening-market", name: "개업 점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "전체 생활밀접업종 조건검색 OPBIZ_STOR_CO_3", comparison: "same_district_other_dongs_mean", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "화면에는 숨기고 통합 지역 비율 계산에만 사용하는 공식 원자료입니다." },
  { code: "opening_rate", sourceCode: "commercial-opening-market", name: "개업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "전체 생활밀접업종 조건검색 공식 OPBIZ_RT_3", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석서비스 지역별 현황이 제공하는 공식 개업률입니다." },
  { code: "closing_count", sourceCode: "commercial-opening-market", name: "폐업 점포 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "개", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "전체 생활밀접업종 조건검색 CLSBIZ_STOR_CO_3", comparison: "same_district_other_dongs_mean", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "화면에는 숨기고 통합 지역 비율 계산에만 사용하는 공식 원자료입니다." },
  { code: "closing_rate", sourceCode: "commercial-opening-market", name: "폐업률", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "전체 생활밀접업종 조건검색 공식 CLSBIZ_RT_3", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석서비스 지역별 현황이 제공하는 공식 폐업률입니다." },
  { code: "monthly_average_income", sourceCode: "income-consumption", name: "월 평균 소득", category: "참고 지역 경제 수준", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "원/월", direction: FavorableDirection.NEUTRAL, aggregation: "조건검색 공식 소득분위 월소득 구간의 상·하한 중간값", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "정확한 평균소득 제공값이 아니라 공식 소득구간 중간값이며 점수와 등급에 반영하지 않습니다." },
  { code: "income_level", sourceCode: "income-consumption", name: "소득분위", category: "참고 지역 경제 수준", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "분위", direction: FavorableDirection.NEUTRAL, aggregation: "조건검색 공식 INCOME_SCTN_CD 최신분기 제공값", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "지역 경제 수준 설명용이며 점수나 등급에 반영하지 않습니다." },
  { code: "household_count", sourceCode: "resident-population", name: "총 가구 수", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "가구", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "공식 TOT_HSHLD_CO 제공값", comparison: "same_district_other_dongs_mean", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "행정동 상주인구 기반 총 가구 수이며 소비 가구 수를 뜻하지 않습니다." },
  { code: "rental_burden", sourceCode: "commercial-rent-market", name: "임대료 부담", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "동일 공간·기준기간의 상가 임대시세 / 추정매출 × 100", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: "현재 연결된 공식 API에는 행정동별 상가 임대시세와 점포 면적이 없어 매출과 의미·공간·기간을 맞춘 임대료 부담률을 계산할 수 없습니다. 주거 전월세 자료는 상가 임대료로 대체하지 않습니다.", proxy: "필수 입력인 상가 임대시세와 호환 가능한 추정매출이 모두 있을 때만 점수에 반영합니다." },
  { code: "rent_level", sourceCode: "commercial-rent-market", name: "상가 환산임대료", category: "참고 지역 경제 수준", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "원/3.3㎡·월", direction: FavorableDirection.NEUTRAL, aggregation: "조건검색 최신분기 전체층 BF3_TOT_FLOOR 제공값", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "3.3㎡당 월 환산임대료 참고값이며 점포 면적이 없어 총 임대료 부담률로 환산하지 않습니다." },
  { code: "median_monthly_rent", sourceCode: "rental-transaction", name: "주거 월세 중위값", category: "참고 지역 경제 수준", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "만원", direction: FavorableDirection.NEUTRAL, aggregation: "대상 법정동의 최신 계약월 월세 거래 중 RTFE가 0보다 큰 자료의 중위값", comparison: "같은 자치구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "대상 법정동 주거용 월세 계약의 공개 표본이며 점수와 등급에 반영하지 않습니다." },
  { code: "estimated_sales", sourceCode: "estimated-sales", name: "점포당 추정매출", category: "상권 변화", areaGroup: IndicatorArea.COMMERCIAL_CHANGE, unit: "원/점포", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "행정동 업종별 THSMON_SELNG_AMT 합계 / 같은 분기 전체 점포 수", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석 모형의 점포당 추정치이며 실제 신고매출이나 주민 소득을 뜻하지 않습니다." },
  { code: "street_floating_population_density", sourceCode: "floating-population", name: "길 단위 유동인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명/ha", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "지역별 현황 조건검색 공식 TOT_FLPOP_CO_3(1ha당 명)", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석서비스가 산출한 1ha당 길 단위 유동인구입니다." },
  { code: "residential_population_density", sourceCode: "floating-population", name: "주거인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명/ha", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "지역별 현황 조건검색 공식 TOT_REPOP_CO_3(1ha당 명)", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석서비스가 산출한 1ha당 주거인구이며 주민등록인구 총수와 동일하지 않습니다." },
  { code: "workplace_population_density", sourceCode: "floating-population", name: "직장인구", category: "활력·혼잡", areaGroup: IndicatorArea.VITALITY_CONGESTION, unit: "명/ha", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "지역별 현황 조건검색 공식 TOT_WRC_POPLTN_CO_3(1ha당 명)", comparison: "같은 자치구 다른 행정동 평균", stale: 120, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "서울시 상권분석서비스가 산출한 1ha당 직장인구이며 사업체 종사자 전수와 동일하지 않습니다." },
  { code: "resident_program_count", sourceCode: "public-program", name: "주민참여 프로그램", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "건", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "서울시 공공서비스예약 중 해당 자치구 전체의 고유 예약서비스 집계(도시재생 관련성과 행정동 소재 여부 미적용)", comparison: "서울시 다른 자치구 명칭기반 평균", stale: 2, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "자치구 전체 공공서비스예약 등록 건수이며 실제 참여인원, 주민 주도성 또는 프로그램 성과를 뜻하지 않습니다." },
  { code: "urban_regeneration_hub_count", sourceCode: "building-register", name: "거점시설 수", category: "공동체·거점", areaGroup: IndicatorArea.COMMUNITY_HUB, unit: "개", direction: FavorableDirection.HIGHER_IS_BETTER, aggregation: "대상 법정동 총괄표제부 주용도코드명 중 교육연구및복지시설과 문화및집회시설 건수 합계", comparison: "같은 자치구 다른 법정동 평균", stale: 45, defaultStatus: ObservationStatus.EMPTY, statusMessage: null, proxy: "총괄표제부 주용도코드명으로 분류한 시설 수이며 실제 거점 기능, 운영 여부 또는 이용 가능 여부를 뜻하지 않습니다." },
];

async function main() {
  for (const area of areas) {
    await prisma.area.upsert({
    where: { slug: area.slug },
    update: {
      cityName: area.cityName, districtName: area.districtName, dongName: area.dongName,
      administrativeDongName: area.administrativeDongName, administrativeDongCode: area.administrativeDongCode,
      legalDongName: area.legalDongName, legalDongCode: area.legalDongCode,
      projectName: area.projectName, projectType: area.projectType, boundaryType: area.boundaryType,
      codeSourceUrl: area.officialCodeSource, codeVerifiedAt: new Date(area.codeVerifiedAt),
      projectStartDate: new Date(area.projectStartDate), projectEndDate: new Date(area.projectEndDate),
      metadata: { codeStatus: area.codeStatus, codeVerificationEvidence: area.codeVerificationEvidence, projectDatePrecision: area.projectDatePrecision, scopeDescription: area.scopeDescription, officialProjectSource: area.officialProjectSource },
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
  }
  for (const source of sources) {
    const enabled = ["building-register", "vacant-house", "commercial-store", "commercial-opening-market", "commercial-rent-market", "income-consumption", "resident-population", "floating-population", "rental-transaction", "estimated-sales", "road-construction", "noise-complaint", "public-program"].includes(source.code);
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
  await prisma.indicatorDefinition.updateMany({
    where: { code: { in: [
      "living_population",
      "floating_population",
      "peak_floating_time_band",
      "floating_population_concentration",
      "street_floating_population_total",
      "floating_population_by_weekday",
    ] } },
    data: { active: false },
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
