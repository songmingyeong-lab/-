import "../envConfig";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, FavorableDirection } from "../generated/prisma/client";
import areas from "../data/target-areas.json";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL이 필요합니다.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const sources = [
  { code: "living-population", name: "행정동 단위 서울 생활인구(내국인)", serviceId: "OA-14991", serviceName: "SPOP_LOCAL_RESD_DONG", sourceUrl: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "daily", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CODE_SE" },
  { code: "building-register", name: "서울시 건축물대장 총괄표제부", serviceId: "OA-22423", serviceName: null, sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do", updateCycle: "daily", collectionCycle: "monthly", geographicUnit: "legal_dong", codeType: "legal", filterField: null },
  { code: "commercial-store", name: "서울시 상권분석서비스(점포-행정동)", serviceId: "OA-22172", serviceName: "VwsmAdstrdStorW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
  { code: "floating-population", name: "서울시 상권분석서비스(길단위인구-행정동)", serviceId: "OA-22178", serviceName: "VwsmAdstrdFlpopW", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", updateCycle: "quarterly", collectionCycle: "quarterly", geographicUnit: "administrative_dong", codeType: "administrative", filterField: "ADSTRD_CD" },
];

const indicators = [
  { code: "living_population", sourceCode: "living-population", name: "일평균 생활인구", category: "활력·혼잡", unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "24개 시간대 산술평균", comparison: "previous_month", stale: 3, proxy: "지역에 머문 인구 규모의 변화" },
  { code: "aged_building_ratio", sourceCode: "building-register", name: "30년 이상 노후건축물 비율", category: "생활 불편·주거환경", unit: "%", direction: FavorableDirection.LOWER_IS_BETTER, aggregation: "검증 후 확정", comparison: "previous_year", stale: 45, proxy: "노후 주거환경의 구조적 상태" },
  { code: "store_count", sourceCode: "commercial-store", name: "전체 점포 수", category: "상권 변화", unit: "개", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서비스 업종별 전체 점포 수 합계", comparison: "previous_quarter", stale: 120, proxy: "행정동 상권 규모 변화" },
  { code: "floating_population", sourceCode: "floating-population", name: "총 유동인구", category: "활력·혼잡", unit: "명", direction: FavorableDirection.CONTEXT_DEPENDENT, aggregation: "서울 상권분석 제공값", comparison: "previous_quarter", stale: 120, proxy: "시간대별 지역 활동량" },
];

async function main() {
  const area = areas[0];
  await prisma.area.upsert({
    where: { slug: area.slug },
    update: {},
    create: {
      slug: area.slug, cityName: area.cityName, districtName: area.districtName, dongName: area.dongName,
      administrativeDongCode: area.administrativeDongCode, legalDongCode: area.legalDongCode,
      projectName: area.projectName, projectType: area.projectType, projectStartDate: new Date(area.projectStartDate), projectEndDate: new Date(area.projectEndDate),
      boundaryType: area.boundaryType, codeSourceUrl: area.officialCodeSource, codeVerifiedAt: new Date(area.codeVerifiedAt),
      metadata: { codeStatus: area.codeStatus, codeVerificationEvidence: area.codeVerificationEvidence, projectDatePrecision: area.projectDatePrecision, scopeDescription: area.scopeDescription, officialProjectSource: area.officialProjectSource },
    },
  });
  for (const source of sources) {
    await prisma.dataSource.upsert({
      where: { code: source.code }, update: source,
      create: { ...source, provider: "서울특별시", responseFormat: "json", enabled: source.code !== "building-register", config: { verificationRequired: source.code === "building-register" } },
    });
  }
  for (const item of indicators) {
    const source = await prisma.dataSource.findUniqueOrThrow({ where: { code: item.sourceCode } });
    await prisma.indicatorDefinition.upsert({
      where: { code: item.code }, update: {},
      create: { code: item.code, name: item.name, category: item.category, unit: item.unit, description: item.proxy, favorableDirection: item.direction, sourceId: source.id, proxyDescription: item.proxy, aggregationMethod: item.aggregation, comparisonPeriod: item.comparison, geographicUnit: source.geographicUnit, staleAfterDays: item.stale, active: true },
    });
  }
}

main().finally(() => prisma.$disconnect());
