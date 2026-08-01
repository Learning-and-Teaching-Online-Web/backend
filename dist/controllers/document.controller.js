"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentController = void 0;
const prisma_1 = require("../config/prisma");
const tutor_repository_1 = require("../repositories/tutor.repository");
exports.documentController = {
    // Get all lessons/documents for a course
    async getByCourse(req, res) {
        try {
            const courseId = req.params.courseId;
            const documents = await prisma_1.prisma.document.findMany({
                where: { course_id: courseId },
                orderBy: { created_at: 'asc' }
            });
            res.status(200).json({ success: true, data: documents });
        }
        catch (error) {
            console.error('Error fetching course documents:', error);
            res.status(400).json({ success: false, error: error.message || 'Lỗi lấy danh sách tài liệu/bài học' });
        }
    },
    // Create a new lesson/document for a course (tutor only)
    async create(req, res) {
        try {
            const userId = req.user?.id;
            const courseId = req.params.courseId;
            const { title, file_url, file_type, description } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!title || !title.trim()) {
                res.status(400).json({ success: false, error: 'Tiêu đề bài học không được để trống' });
                return;
            }
            const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
            if (!tutor) {
                res.status(403).json({ success: false, error: 'Chỉ giảng viên mới có quyền đăng bài học' });
                return;
            }
            // Check course ownership
            const course = await prisma_1.prisma.course.findUnique({
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
            const document = await prisma_1.prisma.document.create({
                data: {
                    course_id: courseId,
                    uploaded_by: userId,
                    title: title.trim(),
                    file_url: file_url ? file_url.trim() : '#',
                    file_type: file_type || 'video',
                    description: description ? description.trim() : null
                }
            });
            res.status(201).json({ success: true, message: 'Đăng bài học mới thành công', data: document });
        }
        catch (error) {
            console.error('Error creating course document:', error);
            res.status(400).json({ success: false, error: error.message || 'Lỗi thêm bài học mới' });
        }
    },
    // Delete a lesson/document (tutor only)
    async delete(req, res) {
        try {
            const userId = req.user?.id;
            const docId = req.params.docId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const document = await prisma_1.prisma.document.findUnique({
                where: { doc_id: docId },
                include: { course: true }
            });
            if (!document) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bài học này' });
                return;
            }
            const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
            if (!tutor || document.course.tutor_id !== tutor.tutor_id) {
                res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bài học này' });
                return;
            }
            await prisma_1.prisma.document.delete({
                where: { doc_id: docId }
            });
            res.status(200).json({ success: true, message: 'Xóa bài học thành công' });
        }
        catch (error) {
            console.error('Error deleting course document:', error);
            res.status(400).json({ success: false, error: error.message || 'Lỗi xóa bài học' });
        }
    },
    // Update a lesson/document (tutor only)
    async update(req, res) {
        try {
            const userId = req.user?.id;
            const docId = req.params.docId;
            const { title, file_url, file_type, description } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const document = await prisma_1.prisma.document.findUnique({
                where: { doc_id: docId },
                include: { course: true }
            });
            if (!document) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bài học này' });
                return;
            }
            const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
            if (!tutor || document.course.tutor_id !== tutor.tutor_id) {
                res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa bài học này' });
                return;
            }
            const updated = await prisma_1.prisma.document.update({
                where: { doc_id: docId },
                data: {
                    ...(title && { title: title.trim() }),
                    ...(file_url !== undefined && { file_url: file_url ? file_url.trim() : '#' }),
                    ...(file_type && { file_type }),
                    ...(description !== undefined && { description: description ? description.trim() : null })
                }
            });
            res.status(200).json({ success: true, message: 'Cập nhật bài học thành công', data: updated });
        }
        catch (error) {
            console.error('Error updating course document:', error);
            res.status(400).json({ success: false, error: error.message || 'Lỗi cập nhật bài học' });
        }
    }
};
