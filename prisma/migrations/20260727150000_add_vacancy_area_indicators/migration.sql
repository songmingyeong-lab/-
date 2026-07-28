CREATE TABLE "VacancyAreaIndicator" (
    "id" TEXT NOT NULL,
    "areaId" TEXT,
    "sidoCode" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,
    "adminDongCode" TEXT NOT NULL,
    "adminDongName" TEXT NOT NULL,
    "projectName" TEXT,
    "baseDate" TIMESTAMP(3) NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "indicatorName" TEXT NOT NULL,
    "value" DECIMAL(20,4),
    "unit" TEXT NOT NULL,
    "vacancyGrade" TEXT NOT NULL DEFAULT '',
    "housingType" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceMethod" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataQualityNote" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VacancyAreaIndicator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VacancyAreaIndicator_adminDongCode_baseDate_indicatorCode_vacancyGrade_housingType_key"
ON "VacancyAreaIndicator"("adminDongCode", "baseDate", "indicatorCode", "vacancyGrade", "housingType");

CREATE INDEX "VacancyAreaIndicator_adminDongCode_baseDate_idx"
ON "VacancyAreaIndicator"("adminDongCode", "baseDate");

ALTER TABLE "VacancyAreaIndicator"
ADD CONSTRAINT "VacancyAreaIndicator_areaId_fkey"
FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VacancyAreaIndicator" ENABLE ROW LEVEL SECURITY;
