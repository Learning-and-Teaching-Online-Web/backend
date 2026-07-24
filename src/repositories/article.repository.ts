import { prisma } from '../config/prisma';

export const articleRepository = {
  async findAll() {
    return await prisma.article.findMany({
      orderBy: { created_at: 'desc' }
    });
  },

  async findById(id: string) {
    return await prisma.article.findUnique({
      where: { id }
    });
  },

  async create(data: {
    title: string;
    excerpt: string;
    content: any; // Json representing paragraphs
    date: string;
    author: string;
    commentsCount?: number;
    category: string;
    imageType: string;
    tags: any; // Json representing tags
  }) {
    return await prisma.article.create({
      data
    });
  },

  async update(id: string, data: any) {
    return await prisma.article.update({
      where: { id },
      data
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
