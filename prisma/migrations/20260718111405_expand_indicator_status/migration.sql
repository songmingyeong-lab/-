-- CreateEnum
CREATE TYPE "IndicatorArea" AS ENUM ('HOUSING_ENVIRONMENT', 'LIVING_INCONVENIENCE', 'COMMERCIAL_CHANGE', 'VITALITY_CONGESTION', 'COMMUNITY_HUB');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ObservationStatus" ADD VALUE 'LOADING';
ALTER TYPE "ObservationStatus" ADD VALUE 'PARTIAL_SUCCESS';
ALTER TYPE "ObservationStatus" ADD VALUE 'UNSUPPORTED_GEOGRAPHY';
ALTER TYPE "ObservationStatus" ADD VALUE 'INSUFFICIENT_SAMPLE';
ALTER TYPE "ObservationStatus" ADD VALUE 'UNVERIFIED';
ALTER TYPE "ObservationStatus" ADD VALUE 'MANUAL_VERIFICATION_REQUIRED';
ALTER TYPE "ObservationStatus" ADD VALUE 'RESTRICTED_DATA';

-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "administrativeDongName" TEXT,
ADD COLUMN     "legalDongName" TEXT;

-- AlterTable
ALTER TABLE "IndicatorDefinition" ADD COLUMN     "areaGroup" "IndicatorArea" NOT NULL DEFAULT 'VITALITY_CONGESTION',
ADD COLUMN     "defaultStatus" "ObservationStatus" NOT NULL DEFAULT 'EMPTY',
ADD COLUMN     "statusMessage" TEXT;
