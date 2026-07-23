import "./envConfig";
import { defineConfig } from "prisma/config";

// `prisma generate` does not connect to this fallback. Runtime and migration
// commands are separately guarded by the application's environment validation.
const prismaDatasourceUrl = process.env.DIRECT_URL
  ?? process.env.DATABASE_URL
  ?? "postgresql://prisma_config:prisma_config@127.0.0.1:5432/prisma_config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: prismaDatasourceUrl,
  },
});
