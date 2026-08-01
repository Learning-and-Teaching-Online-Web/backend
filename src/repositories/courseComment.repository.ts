import { prisma } from '../config/prisma';

function formatCommentUser(comment: any) {
  if (comment?.user) {
    comment.user.full_name = comment.user.user_profile?.full_name || '';
    comment.user.avatar_url = comment.user.user_profile?.avatar_url || null;
  }
  return comment;
}

export const courseCommentRepository = {
  async findByCourseId(courseId: string) {
    const comments = await prisma.courseComment.findMany({
      where: { course_id: courseId },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            role: true,
            user_profile: {
              select: {
                full_name: true,
                avatar_url: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return comments.map(formatCommentUser);
  },

  async findById(commentId: string) {
    return await prisma.courseComment.findUnique({
      where: { comment_id: commentId }
    });
  },

  async create(data: { course_id: string; user_id: string; content: string; rating?: number }) {
    const comment = await prisma.courseComment.create({
      data,
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            role: true,
            user_profile: {
              select: {
                full_name: true,
                avatar_url: true
              }
            }
          }
        }
      }
    });

    return formatCommentUser(comment);
  },

  async delete(commentId: string) {
    return await prisma.courseComment.delete({
      where: { comment_id: commentId }
    });
  }
};
