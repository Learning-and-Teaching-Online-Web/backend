import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // For migrations and CLI tools, connect directly using DIRECT_URL
    url: env("DIRECT_URL") || env("DATABASE_URL") || "",
  },
});
