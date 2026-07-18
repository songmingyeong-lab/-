-- CreateEnum
CREATE TYPE "FavorableDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'NEUTRAL', 'CONTEXT_DEPENDENT');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('SUCCESS', 'EMPTY', 'STALE', 'ERROR', 'MOCK');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "dongName" TEXT NOT NULL,
    "administrativeDongCode" TEXT,
    "legalDongCode" TEXT,
    "projectName" TEXT,
    "projectType" TEXT,
    "projectStartDate" TIMESTAMP(3),
    "projectEndDate" TIMESTAMP(3),
    "boundaryType" TEXT NOT NULL,
    "codeVerifiedAt" TIMESTAMP(3),
    "codeSourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "termsUrl" TEXT,
    "responseFormat" TEXT NOT NULL,
    "updateCycle" TEXT NOT NULL,
    "collectionCycle" TEXT NOT NULL,
    "geographicUnit" TEXT NOT NULL,
    "codeType" TEXT NOT NULL,
    "filterField" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "favorableDirection" "FavorableDirection" NOT NULL,
    "proxyDescription" TEXT NOT NULL,
    "aggregationMethod" TEXT NOT NULL,
    "comparisonPeriod" TEXT NOT NULL,
    "geographicUnit" TEXT NOT NULL,
    "missingValuePolicy" TEXT NOT NULL DEFAULT 'PRESERVE_NULL',
    "staleAfterDays" INTEGER NOT NULL,
    "methodologyVersion" TEXT NOT NULL DEFAULT '1.0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicatorDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorObservation" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "value" DECIMAL(20,4),
    "baseDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "aggregationKey" TEXT NOT NULL DEFAULT 'total',
    "geographicUnit" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ObservationStatus" NOT NULL,
    "sourceReference" TEXT,
    "rawRecordHash" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "IndicatorObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "CollectionStatus" NOT NULL DEFAULT 'RUNNING',
    "requestedArea" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "CollectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "status" "CollectionStatus" NOT NULL,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "CollectionRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawPublicData" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "areaId" TEXT,
    "baseDate" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "RawPublicData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorDefinition_code_key" ON "IndicatorDefinition"("code");

-- CreateIndex
CREATE INDEX "IndicatorObservation_areaId_indicatorId_baseDate_idx" ON "IndicatorObservation"("areaId", "indicatorId", "baseDate");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorObservation_areaId_indicatorId_baseDate_aggregatio_key" ON "IndicatorObservation"("areaId", "indicatorId", "baseDate", "aggregationKey");

-- CreateIndex
CREATE UNIQUE INDEX "RawPublicData_sourceId_payloadHash_key" ON "RawPublicData"("sourceId", "payloadHash");

-- AddForeignKey
ALTER TABLE "IndicatorDefinition" ADD CONSTRAINT "IndicatorDefinition_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorObservation" ADD CONSTRAINT "IndicatorObservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorObservation" ADD CONSTRAINT "IndicatorObservation_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "IndicatorDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRun" ADD CONSTRAINT "CollectionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRunItem" ADD CONSTRAINT "CollectionRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CollectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawPublicData" ADD CONSTRAINT "RawPublicData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawPublicData" ADD CONSTRAINT "RawPublicData_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
