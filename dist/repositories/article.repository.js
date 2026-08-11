"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.articleRepository = {
    async findAll() {
        return await prisma_1.prisma.article.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                category_relation: true
            }
        });
    },
    async findById(id) {
        return await prisma_1.prisma.article.findUnique({
            where: { id },
            include: {
                category_relation: true
            }
        });
    },
    async create(data) {
        return await prisma_1.prisma.article.create({
            data: {
                ...data,
                published_at: data.published_at ? new Date(data.published_at) : new Date()
            },
            include: {
                category_relation: true
            }
        });
    },
    async update(id, data) {
        return await prisma_1.prisma.article.update({
            where: { id },
            data,
            include: {
                category_relation: true
            }
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
