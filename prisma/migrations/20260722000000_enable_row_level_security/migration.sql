-- Supabase security baseline. The dashboard continues to access PostgreSQL
-- only through its server-side Prisma connection; no anon/authenticated policy
-- is created in phase 1.
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndicatorDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndicatorObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollectionRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollectionRunItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RawPublicData" ENABLE ROW LEVEL SECURITY;
