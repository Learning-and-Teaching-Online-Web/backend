"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleCommentRepository = void 0;
const prisma_1 = require("../config/prisma");
function formatCommentUser(comment) {
    if (comment?.user) {
        const profile = comment.user.admin_profile || comment.user.student_profile || comment.user.tutor_profile;
        comment.user.full_name = profile?.full_name || '';
        comment.user.avatar_url = profile?.avatar_url || null;
    }
    return comment;
}
exports.articleCommentRepository = {
    async findByArticleId(articleId) {
        const comments = await prisma_1.prisma.articleComment.findMany({
            where: { article_id: articleId },
            include: {
                user: {
                    select: {
                        user_id: true,
                        email: true,
                        role: true,
                        student_profile: { select: { full_name: true, avatar_url: true } },
                        tutor_profile: { select: { full_name: true, avatar_url: true } },
                        admin_profile: { select: { full_name: true, avatar_url: true } }
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });
        return comments.map(formatCommentUser);
    },
    async findById(commentId) {
        return await prisma_1.prisma.articleComment.findUnique({
            where: { comment_id: commentId }
        });
    },
    async create(data) {
        const comment = await prisma_1.prisma.articleComment.create({
            data,
            include: {
                user: {
                    select: {
                        user_id: true,
                        email: true,
                        role: true,
                        student_profile: { select: { full_name: true, avatar_url: true } },
                        tutor_profile: { select: { full_name: true, avatar_url: true } },
                        admin_profile: { select: { full_name: true, avatar_url: true } }
                    }
                }
            }
        });
        // Update article commentsCount
        await prisma_1.prisma.article.update({
            where: { id: data.article_id },
            data: {
                commentsCount: { increment: 1 }
            }
        }).catch(err => console.error('Failed to increment commentsCount on article:', err));
        return formatCommentUser(comment);
    },
    async delete(commentId) {
        const comment = await prisma_1.prisma.articleComment.findUnique({
            where: { comment_id: commentId }
        });
        if (comment) {
            await prisma_1.prisma.articleComment.delete({
                where: { comment_id: commentId }
            });
            await prisma_1.prisma.article.update({
                where: { id: comment.article_id },
                data: {
                    commentsCount: { decrement: 1 }
                }
            }).catch(err => console.error('Failed to decrement commentsCount on article:', err));
        }
        return comment;
    }
};
