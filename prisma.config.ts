import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local explicitly (dotenv doesn't load it by default)
config({ path: resolve(__dirname, ".env.local") });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
