import { createHash } from "node:crypto";
import { CollectionStatus, ObservationStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { AdapterResult } from "@/lib/collection/types";
import { getPrismaClient } from "@/lib/db/client";

const observationStatuses = {
  loading: ObservationStatus.LOADING,
  success: ObservationStatus.SUCCESS,
  empty: ObservationStatus.EMPTY,
  stale: ObservationStatus.STALE,
  error: ObservationStatus.ERROR,
  mock: ObservationStatus.MOCK,
  partial_success: ObservationStatus.PARTIAL_SUCCESS,
  unsupported_geography: ObservationStatus.UNSUPPORTED_GEOGRAPHY,
  insufficient_sample: ObservationStatus.INSUFFICIENT_SAMPLE,
  unverified: ObservationStatus.UNVERIFIED,
  manual_verification_required: ObservationStatus.MANUAL_VERIFICATION_REQUIRED,
  restricted_data: ObservationStatus.RESTRICTED_DATA,
} as const;

export async function persistAdapterResult(areaSlug: string, result: AdapterResult, saveRaw: boolean) {
  const prisma = getPrismaClient();
  const [area, source] = await Promise.all([
    prisma.area.findUniqueOrThrow({ where: { slug: areaSlug } }),
    prisma.dataSource.findUniqueOrThrow({ where: { code: result.sourceCode } }),
  ]);
  const run = await prisma.collectionRun.create({ data: { sourceId: source.id, requestedArea: areaSlug } });
  let saved = 0;
  try {
    for (const indicator of result.indicators) {
      if (!indicator.baseDate) continue;
      const definition = await prisma.indicatorDefinition.findUniqueOrThrow({ where: { code: indicator.code } });
      const observationStatus = observationStatuses[indicator.status];
      await prisma.indicatorObservation.upsert({
        where: { areaId_indicatorId_baseDate_aggregationKey: { areaId: area.id, indicatorId: definition.id, baseDate: new Date(`${indicator.baseDate}T00:00:00+09:00`), aggregationKey: "total" } },
        update: { value: indicator.value, collectedAt: new Date(), status: observationStatus, sourceReference: indicator.sourceUrl, metadata: { series: indicator.series, statusMessage: indicator.statusMessage } as unknown as Prisma.InputJsonValue },
        create: { areaId: area.id, indicatorId: definition.id, value: indicator.value, baseDate: new Date(`${indicator.baseDate}T00:00:00+09:00`), aggregationKey: "total", geographicUnit: indicator.geographicUnit, status: observationStatus, sourceReference: indicator.sourceUrl, metadata: { series: indicator.series, statusMessage: indicator.statusMessage } as unknown as Prisma.InputJsonValue },
      });
      saved += 1;
    }
    if (saveRaw) {
      for (const payload of result.rawPayloads ?? []) {
        const serialized = JSON.stringify(payload);
        const payloadHash = createHash("sha256").update(serialized).digest("hex");
        await prisma.rawPublicData.upsert({ where: { sourceId_payloadHash: { sourceId: source.id, payloadHash } }, update: {}, create: { sourceId: source.id, areaId: area.id, payload: payload as never, payloadHash } });
      }
    }
    await prisma.collectionRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: result.status === "error" ? CollectionStatus.ERROR : CollectionStatus.SUCCESS, successCount: saved, failureCount: result.status === "error" ? 1 : 0, skippedCount: result.recordsSkipped, errorSummary: result.error } });
    return saved;
  } catch (error) {
    await prisma.collectionRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: CollectionStatus.ERROR, failureCount: 1, errorSummary: error instanceof Error ? error.message : "DB 저장 실패" } });
    throw error;
  }
}
