import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 1. Fix Decimal JSON Serialization for Express API responses
(Prisma.Decimal.prototype as any).toJSON = function () {
  const num = Number(this.toString());
  return Number.isNaN(num) ? this.toString() : num;
};

const basePrisma = new PrismaClient({ adapter });

// 2. Prisma Extension: Automatic Soft Delete filtering on User model queries
export const prisma = basePrisma.$extends({
  query: {
    user: {
      async findMany({ args, query }) {
        args.where = { status: { not: "deleted" }, ...args.where };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { status: { not: "deleted" }, ...args.where };
        return query(args);
      },
    },
  },
});

// Handle graceful shutdown
process.on("beforeExit", async () => {
  await basePrisma.$disconnect();
  await pool.end();
});
