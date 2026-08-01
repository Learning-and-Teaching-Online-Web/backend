"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseCommentController = void 0;
const courseComment_repository_1 = require("../repositories/courseComment.repository");
exports.courseCommentController = {
    async getByCourse(req, res) {
        try {
            const courseId = req.params.courseId;
            if (!courseId) {
                res.status(400).json({ success: false, error: 'Thiếu ID khóa học' });
                return;
            }
            const comments = await courseComment_repository_1.courseCommentRepository.findByCourseId(courseId);
            res.status(200).json({ success: true, data: comments });
        }
        catch (error) {
            console.error('Error in getByCourse comments:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async create(req, res) {
        try {
            const userId = req.user?.id || req.user?.user_id;
            const courseId = req.params.courseId;
            const { content, rating } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để gửi bình luận' });
                return;
            }
            if (!content || !content.trim()) {
                res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
                return;
            }
            const parsedRating = rating ? parseInt(rating, 10) : undefined;
            const { prisma } = require('../config/prisma');
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            // Regular users (Students) must meet enrollment & completion criteria
            if (userRole !== 'admin') {
                const course = await prisma.course.findUnique({
                    where: { course_id: courseId }
                });
                if (!course) {
                    res.status(404).json({ success: false, error: 'Không tìm thấy khóa học.' });
                    return;
                }
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { user_id: userId }
                });
                if (!studentProfile) {
                    res.status(403).json({ success: false, error: 'Tài khoản của bạn cần là Học sinh để bình luận & đánh giá khóa học.' });
                    return;
                }
                const booking = await prisma.booking.findFirst({
                    where: {
                        student_id: studentProfile.student_id,
                        course_id: courseId
                    },
                    orderBy: { created_at: 'desc' }
                });
                if (!booking) {
                    res.status(403).json({
                        success: false,
                        error: 'Bạn chưa mua khóa học này nên chưa thể gửi bình luận & đánh giá.'
                    });
                    return;
                }
                const isPaid = booking.payment_status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed';
                if (course.type === 'online') {
                    if (booking.status !== 'completed') {
                        res.status(403).json({
                            success: false,
                            error: 'Khóa học Online cần phải kết thúc toàn bộ khóa học (trạng thái Hoàn thành) mới có thể gửi bình luận & đánh giá.'
                        });
                        return;
                    }
                }
                else if (course.type === 'offline') {
                    if (!isPaid) {
                        res.status(403).json({
                            success: false,
                            error: 'Bạn cần mua/thanh toán khóa học Offline thành công mới có thể gửi bình luận & đánh giá.'
                        });
                        return;
                    }
                }
            }
            const newComment = await courseComment_repository_1.courseCommentRepository.create({
                course_id: courseId,
                user_id: userId,
                content: content.trim(),
                rating: parsedRating && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : undefined
            });
            res.status(201).json({ success: true, message: 'Đăng bình luận thành công', data: newComment });
        }
        catch (error) {
            console.error('Error in create course comment:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async delete(req, res) {
        try {
            const userId = req.user?.id || req.user?.user_id;
            const commentId = req.params.commentId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện' });
                return;
            }
            const comment = await courseComment_repository_1.courseCommentRepository.findById(commentId);
            if (!comment) {
                res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
                return;
            }
            const userRole = req.user?.user_metadata?.role || req.user?.role;
            if (comment.user_id !== userId && userRole !== 'admin') {
                res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
                return;
            }
            await courseComment_repository_1.courseCommentRepository.delete(commentId);
            res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
        }
        catch (error) {
            console.error('Error in delete course comment:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    }
};
