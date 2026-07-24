import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { courseCommentRepository } from '../repositories/courseComment.repository';

export const courseCommentController = {
  async getByCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.courseId as string;
      if (!courseId) {
        res.status(400).json({ success: false, error: 'Thiếu ID khóa học' });
        return;
      }

      const comments = await courseCommentRepository.findByCourseId(courseId);
      res.status(200).json({ success: true, data: comments });
    } catch (error: any) {
      console.error('Error in getByCourse comments:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const courseId = req.params.courseId as string;
      const { content, rating } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để gửi bình luận' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
        return;
      }

      const parsedRating = rating ? parseInt(rating, 10) : undefined;

      const newComment = await courseCommentRepository.create({
        course_id: courseId,
        user_id: userId,
        content: content.trim(),
        rating: parsedRating && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : undefined
      });

      res.status(201).json({ success: true, message: 'Đăng bình luận thành công', data: newComment });
    } catch (error: any) {
      console.error('Error in create course comment:', error);
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

      const comment = await courseCommentRepository.findById(commentId);
      if (!comment) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
        return;
      }

      const userRole = req.user?.user_metadata?.role || req.user?.role;
      if (comment.user_id !== userId && userRole !== 'admin') {
        res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
        return;
      }

      await courseCommentRepository.delete(commentId);
      res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
    } catch (error: any) {
      console.error('Error in delete course comment:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
