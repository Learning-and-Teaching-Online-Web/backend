import { prisma } from '../config/prisma';

export const articleCategoryRepository = {
  async findAll(includeInactive = false) {
    return await prisma.articleCategory.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { order_index: 'asc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
  },

  async findById(category_id: string) {
    return await prisma.articleCategory.findUnique({
      where: { category_id },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
  },

  async findBySlug(slug: string) {
    return await prisma.articleCategory.findUnique({
      where: { slug }
    });
  },

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    order_index?: number;
    is_active?: boolean;
  }) {
    const slug = data.slug || data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    return await prisma.articleCategory.create({
      data: {
        ...data,
        slug
      }
    });
  },

  async update(category_id: string, data: any) {
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
    return await prisma.articleCategory.update({
      where: { category_id },
      data
    });
  },

  async delete(category_id: string) {
    return await prisma.articleCategory.delete({
      where: { category_id }
    });
  }
};
