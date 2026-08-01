"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is missing");
}
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
// 1. Fix Decimal JSON Serialization for Express API responses
client_1.Prisma.Decimal.prototype.toJSON = function () {
    const num = Number(this.toString());
    return Number.isNaN(num) ? this.toString() : num;
};
const basePrisma = new client_1.PrismaClient({ adapter });
// 2. Prisma Extension: Automatic Soft Delete filtering on User model queries
exports.prisma = basePrisma.$extends({
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
