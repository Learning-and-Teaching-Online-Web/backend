"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseCommentRepository = void 0;
const prisma_1 = require("../config/prisma");
function formatCommentUser(comment) {
    if (comment?.user) {
        comment.user.full_name = comment.user.user_profile?.full_name || '';
        comment.user.avatar_url = comment.user.user_profile?.avatar_url || null;
    }
    return comment;
}
exports.courseCommentRepository = {
    async findByCourseId(courseId) {
        const comments = await prisma_1.prisma.courseComment.findMany({
            where: { course_id: courseId },
            include: {
                user: {
                    select: {
                        user_id: true,
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
    async findById(commentId) {
        return await prisma_1.prisma.courseComment.findUnique({
            where: { comment_id: commentId }
        });
    },
    async create(data) {
        const comment = await prisma_1.prisma.courseComment.create({
            data,
            include: {
                user: {
                    select: {
                        user_id: true,
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
    async delete(commentId) {
        return await prisma_1.prisma.courseComment.delete({
            where: { comment_id: commentId }
        });
    }
};
