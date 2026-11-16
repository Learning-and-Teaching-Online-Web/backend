import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // For migrations and CLI tools, connect directly using DIRECT_URL
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
