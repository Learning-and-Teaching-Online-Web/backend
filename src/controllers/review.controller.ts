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
        include: { course: true }
      });

      if (!booking) {
        res.status(404).json({ success: false, error: 'Không tìm thấy thông tin đơn đặt lớp.' });
        return;
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
