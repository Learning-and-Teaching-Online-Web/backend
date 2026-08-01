"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const admin_repository_1 = require("../repositories/admin.repository");
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
exports.adminService = {
    async getDashboardStats() {
        return await admin_repository_1.adminRepository.getDashboardStats();
    },
    async getUsers(query) {
        const filters = {
            search: query.search || undefined,
            role: query.role || undefined,
            status: query.status || undefined,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10
        };
        const { users, total } = await admin_repository_1.adminRepository.getUsers(filters);
        return {
            users,
            total,
            page: filters.page,
            limit: filters.limit
        };
    },
    async updateUserStatus(userId, status) {
        if (!Object.values(client_1.UserStatus).includes(status)) {
            throw new Error('Trạng thái người dùng không hợp lệ');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { user_id: userId } });
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }
        if (user.role === 'admin') {
            throw new Error('Không thể thay đổi trạng thái của tài khoản Quản trị viên!');
        }
        return await admin_repository_1.adminRepository.updateUserStatus(userId, status);
    },
    async updateUserRole(userId, role) {
        if (!Object.values(client_1.UserRole).includes(role)) {
            throw new Error('Vai trò người dùng không hợp lệ');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { user_id: userId } });
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }
        if (user.role === 'admin') {
            throw new Error('Không thể thay đổi vai trò của tài khoản Quản trị viên!');
        }
        return await admin_repository_1.adminRepository.updateUserRole(userId, role);
    },
    async getTutors(query) {
        const filters = {
            verifiedStatus: query.verifiedStatus || undefined,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10
        };
        const { tutors, total } = await admin_repository_1.adminRepository.getTutors(filters);
        return {
            tutors,
            total,
            page: filters.page,
            limit: filters.limit
        };
    },
    async updateTutorVerification(tutorId, status) {
        if (!Object.values(client_1.VerificationStatus).includes(status)) {
            throw new Error('Trạng thái xác thực không hợp lệ');
        }
        return await admin_repository_1.adminRepository.updateTutorVerificationStatus(tutorId, status);
    },
    async getTutorCertificates(tutorId) {
        return await admin_repository_1.adminRepository.getTutorCertificates(tutorId);
    },
    async updateCertificateStatus(certId, status, adminNote, adminId) {
        if (!Object.values(client_1.VerificationStatus).includes(status)) {
            throw new Error('Trạng thái duyệt chứng chỉ không hợp lệ');
        }
        return await admin_repository_1.adminRepository.updateCertificateStatus(certId, status, adminNote, adminId);
    },
    async getCourses(query) {
        const filters = {
            search: query.search || undefined,
            status: query.status || undefined,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10
        };
        const { courses, total } = await admin_repository_1.adminRepository.getCourses(filters);
        return {
            courses,
            total,
            page: filters.page,
            limit: filters.limit
        };
    },
    async updateCourseStatus(courseId, status) {
        if (!Object.values(client_1.CourseStatus).includes(status)) {
            throw new Error('Trạng thái khóa học không hợp lệ');
        }
        return await admin_repository_1.adminRepository.updateCourseStatus(courseId, status);
    },
    async getTransactions(query) {
        const filters = {
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10
        };
        const { transactions, total } = await admin_repository_1.adminRepository.getTransactions(filters);
        return {
            transactions,
            total,
            page: filters.page,
            limit: filters.limit
        };
    },
    async getPayouts(query) {
        const filters = {
            status: query.status || undefined,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10
        };
        const { payouts, total } = await admin_repository_1.adminRepository.getPayouts(filters);
        return {
            payouts,
            total,
            page: filters.page,
            limit: filters.limit
        };
    },
    async updatePayoutStatus(payoutId, status, adminId) {
        if (!Object.values(client_1.PayoutStatus).includes(status)) {
            throw new Error('Trạng thái rút tiền không hợp lệ');
        }
        return await admin_repository_1.adminRepository.updatePayoutStatus(payoutId, status, adminId);
    }
};
