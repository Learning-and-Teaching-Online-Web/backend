import { prisma } from '../config/prisma';

export const articleRepository = {
  async findAll() {
    return await prisma.article.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        category_relation: true
      }
    });
  },

  async findById(id: string) {
    return await prisma.article.findUnique({
      where: { id },
      include: {
        category_relation: true
      }
    });
  },

  async create(data: {
    title: string;
    excerpt: string;
    content: any;
    published_at?: Date | string;
    author: string;
    author_id?: string;
    commentsCount?: number;
    category: string;
    category_id?: string;
    imageType: string;
    tags: any;
  }) {
    return await prisma.article.create({
      data: {
        ...data,
        published_at: data.published_at ? new Date(data.published_at) : new Date()
      },
      include: {
        category_relation: true
      }
    });
  },

  async update(id: string, data: any) {
    return await prisma.article.update({
      where: { id },
      data,
      include: {
        category_relation: true
      }
    });
  },

  async delete(id: string) {
    return await prisma.article.delete({
      where: { id }
    });
  },

  async createMany(articles: any[]) {
    return await prisma.article.createMany({
      data: articles,
      skipDuplicates: true
    });
  }
};
