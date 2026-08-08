import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { bookingService } from '../services/booking.service';

export const bookingController = {
  // Create a new booking
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { courseId, scheduleId, notes } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (!courseId) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin khóa học' });
        return;
      }

      const result = await bookingService.createBooking(userId, courseId, scheduleId, notes);
      res.status(201).json({ success: true, message: 'Đăng ký khóa học thành công', data: result });
    } catch (error: any) {
      console.error('Error in createBooking controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // List student bookings
  async listMyBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await bookingService.getMyBookings(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in listMyBookings controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Get student wallet details and history
  async getStudentWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await bookingService.getStudentWallet(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getStudentWallet controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Mock deposit for student wallet
  async depositStudentWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const { amount } = req.body;
      const numericAmount = Number(amount);

      if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
        res.status(400).json({ success: false, error: 'Số tiền nạp phải lớn hơn 0' });
        return;
      }

      if (numericAmount > 100_000_000) {
        res.status(400).json({ success: false, error: 'Số tiền nạp tối đa là 100.000.000 VNĐ' });
        return;
      }

      const data = await bookingService.depositStudentWallet(userId, numericAmount);
      res.status(200).json({ success: true, message: `Nạp ${numericAmount.toLocaleString('vi-VN')} VNĐ thành công`, data });
    } catch (error: any) {
      console.error('Error in depositStudentWallet controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Pay booking using wallet
  async payBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const bookingId = req.params.id as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      if (!bookingId) {
        res.status(400).json({ success: false, error: 'Thiếu mã đơn đăng ký' });
        return;
      }

      const result = await bookingService.payBooking(userId, bookingId);
      res.status(200).json({ success: true, message: 'Thanh toán khóa học thành công', data: result });
    } catch (error: any) {
      console.error('Error in payBooking controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  }
};
