import { prisma } from '../config/prisma';

export const courseCommentRepository = {
  async findByCourseId(courseId: string) {
    return await prisma.courseComment.findMany({
      where: { course_id: courseId },
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
    return await prisma.courseComment.findUnique({
      where: { comment_id: commentId }
    });
  },

  async create(data: { course_id: string; user_id: string; content: string; rating?: number }) {
    return await prisma.courseComment.create({
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
  },

  async delete(commentId: string) {
    return await prisma.courseComment.delete({
      where: { comment_id: commentId }
    });
  }
};
