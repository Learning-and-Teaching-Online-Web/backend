import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { classroomService, ClassroomAccessError } from '../services/classroom.service';

export const classroomController = {
  /**
   * Endpoint GET /api/classroom/:scheduleId/access
   * Kiểm tra quyền truy cập vào phòng học trực tuyến
   */
  async checkAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.user_id;
      const userRole = req.user?.role || req.user?.user_metadata?.role;
      const scheduleId = Array.isArray(req.params.scheduleId)
        ? req.params.scheduleId[0]
        : (req.params.scheduleId as string);

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để thực hiện hành động này'
        });
        return;
      }

      const result = await classroomService.checkClassroomAccess(scheduleId, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Xác thực quyền vào phòng học thành công',
        data: result
      });
    } catch (error: unknown) {
      if (error instanceof ClassroomAccessError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống khi kiểm tra quyền vào lớp';
      console.error('Error in classroom checkAccess controller:', error);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  },

  /**
   * Endpoint PATCH /api/classroom/:scheduleId/status
   * Cập nhật trạng thái buổi học (ongoing | completed)
   * Chỉ gia sư sở hữu khóa học mới có quyền thực hiện.
   */
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.user_id;
      const userRole = req.user?.role || req.user?.user_metadata?.role;
      const scheduleId = Array.isArray(req.params.scheduleId)
        ? req.params.scheduleId[0]
        : (req.params.scheduleId as string);
      const { status } = req.body || {};

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để thực hiện hành động này'
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Trường status là bắt buộc (ongoing | completed)'
        });
        return;
      }

      const result = await classroomService.updateSessionStatus(scheduleId, status, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái buổi học thành công',
        data: result
      });
    } catch (error: unknown) {
      if (error instanceof ClassroomAccessError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống khi cập nhật trạng thái buổi học';
      console.error('Error in classroom updateStatus controller:', error);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
};
