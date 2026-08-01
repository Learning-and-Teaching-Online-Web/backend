"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const admin_service_1 = require("../services/admin.service");
exports.adminController = {
    // 1. Dashboard Statistics
    async getDashboardStats(req, res) {
        try {
            const stats = await admin_service_1.adminService.getDashboardStats();
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    // 2. User Management
    async getUsers(req, res) {
        try {
            const result = await admin_service_1.adminService.getUsers(req.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('Error in getUsers:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async updateUserStatus(req, res) {
        try {
            const userId = req.params.userId;
            const { status } = req.body;
            if (!status) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin trạng thái' });
                return;
            }
            const user = await admin_service_1.adminService.updateUserStatus(userId, status);
            res.status(200).json({ success: true, message: 'Cập nhật trạng thái người dùng thành công', data: user });
        }
        catch (error) {
            console.error('Error in updateUserStatus:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    },
    async updateUserRole(req, res) {
        try {
            const userId = req.params.userId;
            const { role } = req.body;
            if (!role) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin vai trò' });
                return;
            }
            const user = await admin_service_1.adminService.updateUserRole(userId, role);
            res.status(200).json({ success: true, message: 'Cập nhật vai trò người dùng thành công', data: user });
        }
        catch (error) {
            console.error('Error in updateUserRole:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    },
    // 3. Tutor & Certificate Verification
    async getTutors(req, res) {
        try {
            const result = await admin_service_1.adminService.getTutors(req.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('Error in getTutors:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async updateTutorVerification(req, res) {
        try {
            const tutorId = req.params.tutorId;
            const { status } = req.body;
            if (!status) {
                res.status(400).json({ success: false, error: 'Thiếu trạng thái phê duyệt' });
                return;
            }
            const profile = await admin_service_1.adminService.updateTutorVerification(tutorId, status);
            res.status(200).json({ success: true, message: 'Cập nhật hồ sơ gia sư thành công', data: profile });
        }
        catch (error) {
            console.error('Error in updateTutorVerification:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    },
    async getTutorCertificates(req, res) {
        try {
            const tutorId = req.params.tutorId;
            const certificates = await admin_service_1.adminService.getTutorCertificates(tutorId);
            res.status(200).json({ success: true, data: certificates });
        }
        catch (error) {
            console.error('Error in getTutorCertificates:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async updateCertificateStatus(req, res) {
        try {
            const certId = req.params.certId;
            const { status, adminNote } = req.body;
            const adminId = req.user?.id;
            if (!status) {
                res.status(400).json({ success: false, error: 'Thiếu trạng thái duyệt chứng chỉ' });
                return;
            }
            const certificate = await admin_service_1.adminService.updateCertificateStatus(certId, status, adminNote, adminId);
            res.status(200).json({ success: true, message: 'Duyệt chứng chỉ gia sư thành công', data: certificate });
        }
        catch (error) {
            console.error('Error in updateCertificateStatus:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    },
    // 4. Course Moderation
    async getCourses(req, res) {
        try {
            const result = await admin_service_1.adminService.getCourses(req.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('Error in getCourses:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async updateCourseStatus(req, res) {
        try {
            const courseId = req.params.courseId;
            const { status } = req.body;
            if (!status) {
                res.status(400).json({ success: false, error: 'Thiếu trạng thái khóa học' });
                return;
            }
            const course = await admin_service_1.adminService.updateCourseStatus(courseId, status);
            res.status(200).json({ success: true, message: 'Cập nhật trạng thái khóa học thành công', data: course });
        }
        catch (error) {
            console.error('Error in updateCourseStatus:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    },
    // 5. Payment history & Payouts management
    async getTransactions(req, res) {
        try {
            const result = await admin_service_1.adminService.getTransactions(req.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('Error in getTransactions:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async getPayouts(req, res) {
        try {
            const result = await admin_service_1.adminService.getPayouts(req.query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('Error in getPayouts:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        }
    },
    async updatePayoutStatus(req, res) {
        try {
            const payoutId = req.params.payoutId;
            const { status } = req.body;
            const adminId = req.user?.id;
            if (!status) {
                res.status(400).json({ success: false, error: 'Thiếu trạng thái rút tiền' });
                return;
            }
            const payout = await admin_service_1.adminService.updatePayoutStatus(payoutId, status, adminId);
            res.status(200).json({ success: true, message: 'Xử lý yêu cầu rút tiền thành công', data: payout });
        }
        catch (error) {
            console.error('Error in updatePayoutStatus:', error);
            res.status(400).json({ success: false, error: error.message || 'Yêu cầu không hợp lệ' });
        }
    }
};
