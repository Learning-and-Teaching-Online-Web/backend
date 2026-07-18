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
  }
};
