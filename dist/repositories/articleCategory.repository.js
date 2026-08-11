"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleCategoryRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.articleCategoryRepository = {
    async findAll(includeInactive = false) {
        return await prisma_1.prisma.articleCategory.findMany({
            where: includeInactive ? {} : { is_active: true },
            orderBy: { order_index: 'asc' },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        });
    },
    async findById(category_id) {
        return await prisma_1.prisma.articleCategory.findUnique({
            where: { category_id },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        });
    },
    async findBySlug(slug) {
        return await prisma_1.prisma.articleCategory.findUnique({
            where: { slug }
        });
    },
    async create(data) {
        const slug = data.slug || data.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        return await prisma_1.prisma.articleCategory.create({
            data: {
                ...data,
                slug
            }
        });
    },
    async update(category_id, data) {
        if (data.name && !data.slug) {
            data.slug = data.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
        }
        return await prisma_1.prisma.articleCategory.update({
            where: { category_id },
            data
        });
    },
    async delete(category_id) {
        return await prisma_1.prisma.articleCategory.delete({
            where: { category_id }
        });
    }
};
