import { prisma } from '../config/prisma';

export const articleCommentRepository = {
  async findByArticleId(articleId: string) {
    return await prisma.articleComment.findMany({
      where: { article_id: articleId },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            avatar_url: true,
            role: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  },

  async findById(commentId: string) {
    return await prisma.articleComment.findUnique({
      where: { comment_id: commentId }
    });
  },

  async create(data: { article_id: string; user_id: string; content: string }) {
    const comment = await prisma.articleComment.create({
      data,
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            avatar_url: true,
            role: true
          }
        }
      }
    });

    // Update article commentsCount
    await prisma.article.update({
      where: { id: data.article_id },
      data: {
        commentsCount: { increment: 1 }
      }
    }).catch(err => console.error('Failed to increment commentsCount on article:', err));

    return comment;
  },

  async delete(commentId: string) {
    const comment = await prisma.articleComment.findUnique({
      where: { comment_id: commentId }
    });

    if (comment) {
      await prisma.articleComment.delete({
        where: { comment_id: commentId }
      });

      await prisma.article.update({
        where: { id: comment.article_id },
        data: {
          commentsCount: { decrement: 1 }
        }
      }).catch(err => console.error('Failed to decrement commentsCount on article:', err));
    }

    return comment;
  }
};
