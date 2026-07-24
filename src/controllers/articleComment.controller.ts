import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { articleCommentRepository } from '../repositories/articleComment.repository';

export const articleCommentController = {
  async getByArticle(req: Request, res: Response): Promise<void> {
    try {
      const articleId = req.params.articleId as string;
      if (!articleId) {
        res.status(400).json({ success: false, error: 'Thiếu ID bài viết' });
        return;
      }

      const comments = await articleCommentRepository.findByArticleId(articleId);
      res.status(200).json({ success: true, data: comments });
    } catch (error: any) {
      console.error('Error in getByArticle comments:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const articleId = req.params.articleId as string;
      const { content } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để gửi bình luận' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
        return;
      }

      const newComment = await articleCommentRepository.create({
        article_id: articleId,
        user_id: userId,
        content: content.trim()
      });

      res.status(201).json({ success: true, message: 'Đăng bình luận thành công', data: newComment });
    } catch (error: any) {
      console.error('Error in create article comment:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const commentId = req.params.commentId as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện' });
        return;
      }

      const comment = await articleCommentRepository.findById(commentId);
      if (!comment) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
        return;
      }

      const userRole = req.user?.user_metadata?.role || req.user?.role;
      if (comment.user_id !== userId && userRole !== 'admin') {
        res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
        return;
      }

      await articleCommentRepository.delete(commentId);
      res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
    } catch (error: any) {
      console.error('Error in delete article comment:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
