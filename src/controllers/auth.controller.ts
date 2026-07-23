import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.signUp(req.body);
      res.status(201).json({ success: true, message: 'Đăng ký thành công', data: user });
    } catch (error: any) {
      console.error('Error in signUp:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.signIn(req.body);
      res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result });
    } catch (error: any) {
      console.error('Error in signIn:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  async signOut(req: Request, res: Response): Promise<void> {
    try {
      await authService.signOut();
      res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // Lấy token từ header Authorization (Bearer <token>)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ success: false, error: 'Thiếu token xác thực' });
        return;
      }
      const token = authHeader.split(' ')[1];

      const profile = await authService.getProfile(token);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message });
    }
  }
};