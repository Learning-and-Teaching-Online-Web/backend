import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { favoriteRepository } from '../repositories/favorite.repository';

export const favoriteController = {
  async toggleFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || req.user?.user_metadata?.role;
      const { tutorId } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (userRole !== 'student') {
        res.status(403).json({ success: false, error: 'Chỉ tài khoản Học viên mới có quyền sử dụng tính năng Gia sư yêu thích.' });
        return;
      }

      if (!tutorId) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin ID giảng viên' });
        return;
      }

      let student = await favoriteRepository.findStudentProfileByUserId(userId);
      if (!student) {
        student = await favoriteRepository.createStudentProfile(userId);
      }

      const existing = await favoriteRepository.findFavorite(student.student_id, tutorId);
      if (existing) {
        await favoriteRepository.remove(student.student_id, tutorId);
        res.status(200).json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích', isFavorite: false });
      } else {
        await favoriteRepository.add(student.student_id, tutorId);
        res.status(201).json({ success: true, message: 'Đã thêm vào danh sách yêu thích', isFavorite: true });
      }
    } catch (error: any) {
      console.error('Error in toggleFavorite:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async listMyFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || req.user?.user_metadata?.role;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (userRole !== 'student') {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const student = await favoriteRepository.findStudentProfileByUserId(userId);
      if (!student) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const favorites = await favoriteRepository.getFavoritesByStudentId(student.student_id);
      res.status(200).json({ success: true, data: favorites });
    } catch (error: any) {
      console.error('Error in listMyFavorites:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
