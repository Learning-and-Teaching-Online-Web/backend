"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.articleRepository = {
    async findAll() {
        return await prisma_1.prisma.article.findMany({
            orderBy: { created_at: 'desc' }
        });
    },
    async findById(id) {
        return await prisma_1.prisma.article.findUnique({
            where: { id }
        });
    },
    async create(data) {
        return await prisma_1.prisma.article.create({
            data: {
                ...data,
                published_at: data.published_at ? new Date(data.published_at) : new Date()
            }
        });
    },
    async update(id, data) {
        return await prisma_1.prisma.article.update({
            where: { id },
            data
        });
    },
    async delete(id) {
        return await prisma_1.prisma.article.delete({
            where: { id }
        });
    },
    async createMany(articles) {
        return await prisma_1.prisma.article.createMany({
            data: articles,
            skipDuplicates: true
        });
    }
};
