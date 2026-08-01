"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleCommentController = void 0;
const articleComment_repository_1 = require("../repositories/articleComment.repository");
exports.articleCommentController = {
    async getByArticle(req, res) {
        try {
            const articleId = req.params.articleId;
            if (!articleId) {
                res.status(400).json({ success: false, error: 'Thiếu ID bài viết' });
                return;
            }
            const comments = await articleComment_repository_1.articleCommentRepository.findByArticleId(articleId);
            res.status(200).json({ success: true, data: comments });
        }
        catch (error) {
            console.error('Error in getByArticle comments:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async create(req, res) {
        try {
            const userId = req.user?.id || req.user?.user_id;
            const articleId = req.params.articleId;
            const { content } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để gửi bình luận' });
                return;
            }
            if (!content || !content.trim()) {
                res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
                return;
            }
            const newComment = await articleComment_repository_1.articleCommentRepository.create({
                article_id: articleId,
                user_id: userId,
                content: content.trim()
            });
            res.status(201).json({ success: true, message: 'Đăng bình luận thành công', data: newComment });
        }
        catch (error) {
            console.error('Error in create article comment:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async delete(req, res) {
        try {
            const userId = req.user?.id || req.user?.user_id;
            const commentId = req.params.commentId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện' });
                return;
            }
            const comment = await articleComment_repository_1.articleCommentRepository.findById(commentId);
            if (!comment) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
                return;
            }
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            if (comment.user_id !== userId && userRole !== 'admin') {
                res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
                return;
            }
            await articleComment_repository_1.articleCommentRepository.delete(commentId);
            res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
        }
        catch (error) {
            console.error('Error in delete article comment:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    }
};
