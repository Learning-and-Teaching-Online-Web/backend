import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { tutorRepository } from '../repositories/tutor.repository';
import { supabaseAdmin } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const documentController = {
  // Get all lessons/documents for a course
  async getByCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.courseId as string;
      const documents = await prisma.document.findMany({
        where: { course_id: courseId },
        orderBy: { created_at: 'asc' }
      });

      res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      console.error('Error fetching course documents:', error);
      res.status(400).json({ success: false, error: error.message || 'Lỗi lấy danh sách tài liệu/bài học' });
    }
  },

  // Create a new lesson/document for a course (tutor only)
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const courseId = req.params.courseId as string;
      const { title, file_url, file_type, description, file_base64, file_name } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      if (!title || !title.trim()) {
        res.status(400).json({ success: false, error: 'Tiêu đề bài học không được để trống' });
        return;
      }

      // Validate base64 size (approx. 10MB limit = ~14MB in base64 length)
      if (file_base64 && file_base64.length > 14 * 1024 * 1024) {
        res.status(400).json({ success: false, error: 'Dung lượng file vượt quá giới hạn 10MB' });
        return;
      }

      const tutor = await tutorRepository.findByUserId(userId);
      if (!tutor) {
        res.status(403).json({ success: false, error: 'Chỉ giảng viên mới có quyền đăng bài học' });
        return;
      }

      // Check course ownership
      const course = await prisma.course.findUnique({
        where: { course_id: courseId }
      });
      if (!course) {
        res.status(404).json({ success: false, error: 'Không tìm thấy khóa học này' });
        return;
      }
      if (course.tutor_id !== tutor.tutor_id) {
        res.status(403).json({ success: false, error: 'Bạn không có quyền đăng bài học cho khóa học này' });
        return;
      }

      let finalFileUrl = file_url ? file_url.trim() : '#';

      if (file_base64) {
        try {
          await supabaseAdmin.storage.createBucket('course_documents', { public: true });
        } catch (_) {}

        let base64Data = file_base64;
        let contentType = 'application/pdf';

        if (base64Data.includes(';base64,')) {
          const parts = base64Data.split(';base64,');
          contentType = parts[0].replace('data:', '') || 'application/pdf';
          base64Data = parts[1];
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const rawFileName = file_name || `doc_${Date.now()}.pdf`;
        const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${courseId}/${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('course_documents')
          .upload(storagePath, buffer, { contentType, upsert: true });

        if (uploadError) {
          throw new Error(`Upload file lên Supabase thất bại: ${uploadError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('course_documents')
          .getPublicUrl(storagePath);
          
        finalFileUrl = urlData.publicUrl;
      }

      const document = await prisma.document.create({
        data: {
          course_id: courseId,
          uploaded_by: userId,
          title: title.trim(),
          file_url: finalFileUrl,
          file_type: file_type || 'pdf',
          description: description ? description.trim() : null
        }
      });

      res.status(201).json({ success: true, message: 'Đăng bài học mới thành công', data: document });
    } catch (error: any) {
      console.error('Error creating course document:', error);
      res.status(400).json({ success: false, error: error.message || 'Lỗi thêm bài học mới' });
    }
  },

  // Delete a lesson/document (tutor only)
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const docId = req.params.docId as string;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      const document = await prisma.document.findUnique({
        where: { doc_id: docId },
        include: { course: true }
      });

      if (!document) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài học này' });
        return;
      }

      const tutor = await tutorRepository.findByUserId(userId);
      if (!tutor || document.course.tutor_id !== tutor.tutor_id) {
        res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài học này' });
        return;
      }

      await prisma.document.delete({
        where: { doc_id: docId }
      });

      res.status(200).json({ success: true, message: 'Xóa bài học thành công' });
    } catch (error: any) {
      console.error('Error deleting course document:', error);
      res.status(400).json({ success: false, error: error.message || 'Lỗi xóa bài học' });
    }
  },

  // Update a lesson/document
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const docId = req.params.docId as string;
      const { title, file_url, file_type, description, file_base64, file_name } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      // Validate base64 size (approx. 10MB limit = ~14MB in base64 length)
      if (file_base64 && file_base64.length > 14 * 1024 * 1024) {
        res.status(400).json({ success: false, error: 'Dung lượng file vượt quá giới hạn 10MB' });
        return;
      }

      const document = await prisma.document.findUnique({
        where: { doc_id: docId },
        include: { course: true }
      });

      if (!document) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài học/tài liệu này' });
        return;
      }

      const tutor = await tutorRepository.findByUserId(userId);
      if (!tutor || document.course.tutor_id !== tutor.tutor_id) {
        res.status(403).json({ success: false, error: 'Bạn không có quyền sửa tài liệu này' });
        return;
      }

      let finalFileUrl = file_url !== undefined ? file_url.trim() : document.file_url;

      if (file_base64) {
        try {
          await supabaseAdmin.storage.createBucket('course_documents', { public: true });
        } catch (_) {}

        let base64Data = file_base64;
        let contentType = 'application/pdf';

        if (base64Data.includes(';base64,')) {
          const parts = base64Data.split(';base64,');
          contentType = parts[0].replace('data:', '') || 'application/pdf';
          base64Data = parts[1];
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const rawFileName = file_name || `doc_${Date.now()}.pdf`;
        const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${document.course_id}/${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('course_documents')
          .upload(storagePath, buffer, { contentType, upsert: true });

        if (uploadError) {
          throw new Error(`Upload file lên Supabase thất bại: ${uploadError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('course_documents')
          .getPublicUrl(storagePath);
          
        finalFileUrl = urlData.publicUrl;
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      updateData.file_url = finalFileUrl;
      if (file_type !== undefined) updateData.file_type = file_type;
      if (description !== undefined) updateData.description = description ? description.trim() : null;

      const updatedDocument = await prisma.document.update({
        where: { doc_id: docId },
        data: updateData
      });

      res.status(200).json({ success: true, message: 'Cập nhật tài liệu thành công', data: updatedDocument });
    } catch (error: any) {
      console.error('Error updating course document:', error);
      res.status(400).json({ success: false, error: error.message || 'Lỗi cập nhật tài liệu' });
    }
  }
};
