import { Request, Response } from 'express';
import { tutorRepository } from '../repositories/tutor.repository';
import { prisma } from '../config/prisma';
import { tutorService } from '../services/tutor.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const tutorController = {
  // GET /tutors - Lấy tất cả giảng viên
  async getAll(req: Request, res: Response) {
    try {
      const tutors = await tutorRepository.findAll();

      if (tutors && tutors.length > 0) {
        // Lấy tất cả khóa học của hệ thống
        const courses = await prisma.course.findMany({
          select: { course_id: true, tutor_id: true }
        });

        // Lấy tất cả đăng ký học hợp lệ (không bị hủy)
        const bookings = await prisma.booking.findMany({
          where: { status: { not: 'cancelled' } },
          select: { course_id: true, student_id: true }
        });

        const courseMap = courses || [];
        const bookingMap = bookings || [];

        tutors.forEach((tutor: any) => {
          // Đếm số khóa học của giảng viên này
          const tutorCourses = courseMap.filter((c: any) => c.tutor_id === tutor.tutor_id);
          tutor.total_courses = tutorCourses.length;

          // Danh sách các course_id của giảng viên này
          const tutorCourseIds = new Set(tutorCourses.map((c: any) => c.course_id));

          // Đọc danh sách học viên đăng ký các khóa học này
          const tutorBookings = bookingMap.filter((b: any) => tutorCourseIds.has(b.course_id));

          // Số học viên độc nhất (unique student_id)
          tutor.total_students = new Set(tutorBookings.map((b: any) => b.student_id)).size;
        });
      }

      res.json({ success: true, data: tutors });
    } catch (error: any) {
      console.error('Error fetching tutors:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  // GET /tutors/:tutorId - Lấy chi tiết một giảng viên
  async getById(req: Request, res: Response) {
    try {
      const tutorId = req.params.tutorId as string;
      const tutor = await tutorRepository.findById(tutorId);
      if (!tutor) {
        return res.status(404).json({ success: false, error: 'Tutor not found' });
      }

      // Đếm khóa học của giảng viên này
      const courses = await prisma.course.findMany({
        where: { tutor_id: tutorId },
        select: { course_id: true }
      });

      const tutorCourses = courses || [];
      (tutor as any).total_courses = tutorCourses.length;

      if (tutorCourses.length > 0) {
        const courseIds = tutorCourses.map((c: any) => c.course_id);
        const bookings = await prisma.booking.findMany({
          where: {
            course_id: { in: courseIds },
            status: { not: 'cancelled' }
          },
          select: { student_id: true }
        });

        (tutor as any).total_students = new Set((bookings || []).map((b: any) => b.student_id)).size;
      } else {
        (tutor as any).total_students = 0;
      }

      res.json({ success: true, data: tutor });
    } catch (error: any) {
      console.error('Error fetching tutor:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  // Get tutor dashboard stats
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.getStats(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getStats controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Get tutor bookings
  async getBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.getBookings(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getBookings controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Update a booking request status (confirm or cancel)
  async updateBookingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const bookingId = req.params.id as string;
      const { status } = req.body; // 'confirmed' | 'cancelled'

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (!['confirmed', 'cancelled'].includes(status)) {
        res.status(400).json({ success: false, error: 'Trạng thái cập nhật không hợp lệ' });
        return;
      }

      const data = await tutorService.updateBookingStatus(userId, bookingId, status);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái đặt buổi học thành công', data });
    } catch (error: any) {
      console.error('Error in updateBookingStatus controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Get tutor reviews
  async getReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.getReviews(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getReviews controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Get tutor wallet and transaction logs
  async getWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.getWallet(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getWallet controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Submit withdrawal / payout request
  async withdrawFunds(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { amount, bankName, bankAccount } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, error: 'Số tiền rút phải lớn hơn 0' });
        return;
      }

      const data = await tutorService.withdrawFunds(userId, Number(amount), bankName, bankAccount);
      res.status(201).json({ success: true, message: 'Gửi yêu cầu rút tiền thành công', data });
    } catch (error: any) {
      console.error('Error in withdrawFunds controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Get logged-in tutor profile + certificates
  async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.getMyProfile(userId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getMyProfile controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Update tutor profile
  async updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const data = await tutorService.updateMyProfile(userId, req.body);
      res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data });
    } catch (error: any) {
      console.error('Error in updateMyProfile controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Add new certificate
  async addCertificate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { title, file_url, file_base64 } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (!title || (!file_url && !file_base64)) {
        res.status(400).json({ success: false, error: 'Vui lòng nhập Tên chứng chỉ và chọn tệp minh chứng' });
        return;
      }

      const data = await tutorService.addCertificate(userId, req.body);
      res.status(201).json({ success: true, message: 'Gửi chứng chỉ mới thành công', data });
    } catch (error: any) {
      console.error('Error in addCertificate controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Delete certificate
  async deleteCertificate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const certId = req.params.certId as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      await tutorService.deleteCertificate(userId, certId);
      res.status(200).json({ success: true, message: 'Xóa chứng chỉ thành công' });
    } catch (error: any) {
      console.error('Error in deleteCertificate controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },



  // Get ClassSessions for the current tutor
  async getClassSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }
      const result = await tutorService.getClassSessions(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in getClassSessions controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};

