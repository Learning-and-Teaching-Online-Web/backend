"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
const prisma_1 = require("../config/prisma");
async function findAll() {
    try {
        const data = await prisma_1.prisma.subject.findMany({
            where: { is_active: true },
            orderBy: { name: "asc" }
        });
        return { data, error: null };
    }
    catch (error) {
        return { data: null, error };
    }
}
