import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { courseService } from '../services/course.service';
import { supabase as globalSupabase } from '../config/supabase';

export const courseController = {
  // Create a new course
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await courseService.createCourse(client, userId, req.body);
      res.status(201).json({ success: true, message: 'Tạo khóa học thành công', data: result });
    } catch (error: any) {
      console.error('Error in createCourse controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Update a course
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const userId = req.user?.id;
      const courseId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await courseService.updateCourse(client, userId, courseId, req.body);
      res.status(200).json({ success: true, message: 'Cập nhật khóa học thành công', data: result });
    } catch (error: any) {
      console.error('Error in updateCourse controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Delete/Archive a course
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const userId = req.user?.id;
      const courseId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await courseService.deleteCourse(client, userId, courseId);
      res.status(200).json({ success: true, message: 'Xóa (Lưu trữ) khóa học thành công', data: result });
    } catch (error: any) {
      console.error('Error in deleteCourse controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Add teaching schedule slot to a course
  async addSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const userId = req.user?.id;
      const courseId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await courseService.addSchedule(client, userId, courseId, req.body);
      res.status(201).json({ success: true, message: 'Thêm lịch dạy thành công', data: result });
    } catch (error: any) {
      console.error('Error in addSchedule controller:', error);
      res.status(400).json({ success: false, error: error.message || error });
    }
  },

  // Get list of courses with filtering (public view)
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const result = await courseService.listCourses(client, req.query);
      res.status(200).json({ success: true, data: result.data, total: result.total, page: result.page, limit: result.limit });
    } catch (error: any) {
      console.error('Error in listCourses controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Get list of courses for the current tutor
  async myCourses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const result = await courseService.listMyCourses(client, userId, req.query);
      res.status(200).json({ success: true, data: result.data, total: result.total, page: result.page, limit: result.limit });
    } catch (error: any) {
      console.error('Error in myCourses controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  // Get course detailed info
  async detail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client = req.supabase || globalSupabase;
      const courseId = req.params.id as string;
      const result = await courseService.getCourseDetail(client, courseId);

      if (!result) {
        res.status(404).json({ success: false, error: 'Không tìm thấy khóa học này' });
        return;
      }

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in getCourseDetail controller:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
