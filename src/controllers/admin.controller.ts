import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { adminService } from '../services/admin.service';

export const adminController = {
  // 1. Dashboard Statistics
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error in getDashboardStats:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  // 2. User Management
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.getUsers(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getUsers:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin trạng thái' });
        return;
      }
      const user = await adminService.updateUserStatus(userId, status);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái người dùng thành công', data: user });
    } catch (error: any) {
      console.error('Error in updateUserStatus:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  },

  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { role } = req.body;
      if (!role) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin vai trò' });
        return;
      }
      const user = await adminService.updateUserRole(userId, role);
      res.status(200).json({ success: true, message: 'Cập nhật vai trò người dùng thành công', data: user });
    } catch (error: any) {
      console.error('Error in updateUserRole:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  },

  // 3. Tutor & Certificate Verification
  async getTutors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.getTutors(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getTutors:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async updateTutorVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tutorId = req.params.tutorId as string;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu trạng thái phê duyệt' });
        return;
      }
      const profile = await adminService.updateTutorVerification(tutorId, status);
      res.status(200).json({ success: true, message: 'Cập nhật hồ sơ gia sư thành công', data: profile });
    } catch (error: any) {
      console.error('Error in updateTutorVerification:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  },

  async getTutorCertificates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tutorId = req.params.tutorId as string;
      const certificates = await adminService.getTutorCertificates(tutorId);
      res.status(200).json({ success: true, data: certificates });
    } catch (error: any) {
      console.error('Error in getTutorCertificates:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async updateCertificateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const certId = req.params.certId as string;
      const { status, adminNote } = req.body;
      const adminId = req.user?.id;

      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu trạng thái duyệt chứng chỉ' });
        return;
      }

      const certificate = await adminService.updateCertificateStatus(certId, status, adminNote, adminId);
      res.status(200).json({ success: true, message: 'Duyệt chứng chỉ gia sư thành công', data: certificate });
    } catch (error: any) {
      console.error('Error in updateCertificateStatus:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  },

  // 4. Course Moderation
  async getCourses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.getCourses(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getCourses:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async updateCourseStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const courseId = req.params.courseId as string;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu trạng thái khóa học' });
        return;
      }
      const course = await adminService.updateCourseStatus(courseId, status);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái khóa học thành công', data: course });
    } catch (error: any) {
      console.error('Error in updateCourseStatus:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  },

  // 5. Payment history & Payouts management
  async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.getTransactions(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getTransactions:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async getPayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.getPayouts(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getPayouts:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },

  async updatePayoutStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payoutId = req.params.payoutId as string;
      const { status } = req.body;
      const adminId = req.user?.id;

      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu trạng thái rút tiền' });
        return;
      }

      const payout = await adminService.updatePayoutStatus(payoutId, status, adminId);
      res.status(200).json({ success: true, message: 'Xử lý yêu cầu rút tiền thành công', data: payout });
    } catch (error: any) {
      console.error('Error in updatePayoutStatus:', error);
      res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
    }
  }
};
