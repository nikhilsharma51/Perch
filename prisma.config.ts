import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for Prisma CLI commands (migrations, studio, introspection)
    // The application uses DATABASE_URL (pooled) via the Neon adapter
    url: env("DIRECT_URL"),
  },
});