import { Request, Response } from 'express';
import { reviewRepository } from '../repositories/review.repository';

export const reviewController = {
  async getVisibleReviews(req: Request, res: Response): Promise<void> {
    try {
      const reviews = await reviewRepository.findVisibleReviews();
      res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
      console.error('Error in getVisibleReviews:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async createReview(req: Request, res: Response): Promise<void> {
    try {
      const { booking_id, rating, comment, professionalism, communication, punctuality } = req.body;

      if (!booking_id || !rating) {
        res.status(400).json({ success: false, error: 'Mã đặt lớp (booking_id) và số sao đánh giá (rating) là bắt buộc.' });
        return;
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ success: false, error: 'Số sao đánh giá phải từ 1 đến 5 sao.' });
        return;
      }

      // Check existing review
      const existingReview = await reviewRepository.findReviewByBookingId(booking_id);
      if (existingReview) {
        res.status(400).json({ success: false, error: 'Bạn đã gửi đánh giá cho đơn đặt lớp này rồi.' });
        return;
      }

      // Get booking info to resolve student_id & tutor_id
      const { prisma } = require('../config/prisma');
      const booking = await prisma.booking.findUnique({
        where: { booking_id },
        include: { 
          course: true,
          student: true
        }
      });

      if (!booking) {
        res.status(404).json({ success: false, error: 'Không tìm thấy thông tin đơn đặt lớp.' });
        return;
      }

      // Check student ownership if auth req user is present
      const authReq = req as any;
      if (authReq.user && authReq.user.user_id && booking.student?.user_id !== authReq.user.user_id) {
        res.status(403).json({ success: false, error: 'Bạn không có quyền đánh giá đơn đặt lớp của người khác.' });
        return;
      }

      // Business Rule Validation:
      // 1. Mandatory: Course must be paid (or confirmed/completed)
      const isPaid = booking.payment_status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed';
      if (!isPaid) {
        res.status(400).json({ success: false, error: 'Bạn cần hoàn tất thanh toán khóa học trước khi gửi đánh giá.' });
        return;
      }

      // 2. Course Type logic:
      // - Offline course: User can rate as long as it's purchased/paid
      // - Online course: User MUST finish/complete the course (booking.status === 'completed') before rating
      if (booking.course.type === 'online') {
        if (booking.status !== 'completed') {
          res.status(400).json({
            success: false,
            error: 'Khóa học Online cần phải kết thúc toàn bộ khóa học (trạng thái Hoàn thành) mới có thể gửi đánh giá.'
          });
          return;
        }
      } else if (booking.course.type === 'offline') {
        if (!isPaid) {
          res.status(400).json({
            success: false,
            error: 'Bạn cần mua khóa học Offline thành công trước khi gửi đánh giá.'
          });
          return;
        }
      }

      const review = await reviewRepository.insert({
        booking_id,
        student_id: booking.student_id,
        tutor_id: booking.course.tutor_id,
        rating: Number(rating),
        comment: comment || null,
        professionalism: professionalism ? Number(professionalism) : undefined,
        communication: communication ? Number(communication) : undefined,
        punctuality: punctuality ? Number(punctuality) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Gửi đánh giá chất lượng giảng dạy thành công!',
        data: review
      });
    } catch (error: any) {
      console.error('Error in createReview:', error);
      res.status(500).json({ success: false, error: error.message || 'Lỗi xử lý đánh giá.' });
    }
  }
};
