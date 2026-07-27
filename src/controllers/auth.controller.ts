import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.signUp(req.body);
      res.status(201).json({ success: true, message: 'Đăng ký thành công', data: result });
    } catch (error: any) {
      console.error('Error in signUp:', error);
      res.status(400).json({ success: false, error: error.message || 'Đăng ký thất bại' });
    }
  },

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.signIn(req.body);
      res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result });
    } catch (error: any) {
      console.error('Error in signIn:', error);
      res.status(400).json({ success: false, error: error.message || 'Đăng nhập thất bại' });
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      res.status(200).json({ success: true, message: 'Cấp mới access token thành công', data: result });
    } catch (error: any) {
      console.error('Error in refreshToken:', error);
      res.status(401).json({ success: false, error: error.message || 'Refresh token không hợp lệ' });
    }
  },

  async signOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId || req.user?.id;
      await authService.signOut(refreshToken, userId);
      res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Đăng xuất thất bại' });
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          res.status(401).json({ success: false, error: 'Thiếu token xác thực' });
          return;
        }
        const token = authHeader.split(' ')[1];
        const profile = await authService.getProfile(token);
        res.status(200).json({ success: true, data: profile });
        return;
      }

      const profile = await authService.getProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message || 'Lỗi khi lấy thông tin người dùng' });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const updatedProfile = await authService.updateProfile(userId, req.body);
      res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: updatedProfile });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || error });
    }
  }
};