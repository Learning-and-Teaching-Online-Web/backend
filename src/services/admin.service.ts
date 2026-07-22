import { adminRepository } from '../repositories/admin.repository';
import { prisma } from '../config/prisma';
import { UserRole, UserStatus, VerificationStatus, CourseStatus, PayoutStatus } from '@prisma/client';

export const adminService = {
  async getDashboardStats() {
    return await adminRepository.getDashboardStats();
  },

  async getUsers(query: any) {
    const filters = {
      search: query.search || undefined,
      role: query.role || undefined,
      status: query.status || undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };
    const { users, total } = await adminRepository.getUsers(filters);
    return {
      users,
      total,
      page: filters.page,
      limit: filters.limit
    };
  },

  async updateUserStatus(userId: string, status: string) {
    if (!Object.values(UserStatus).includes(status as UserStatus)) {
      throw new Error('Trạng thái người dùng không hợp lệ');
    }
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    if (user.role === 'admin') {
      throw new Error('Không thể thay đổi trạng thái của tài khoản Quản trị viên!');
    }
    return await adminRepository.updateUserStatus(userId, status as UserStatus);
  },

  async updateUserRole(userId: string, role: string) {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new Error('Vai trò người dùng không hợp lệ');
    }
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    if (user.role === 'admin') {
      throw new Error('Không thể thay đổi vai trò của tài khoản Quản trị viên!');
    }
    return await adminRepository.updateUserRole(userId, role as UserRole);
  },

  async getTutors(query: any) {
    const filters = {
      verifiedStatus: query.verifiedStatus || undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };
    const { tutors, total } = await adminRepository.getTutors(filters);
    return {
      tutors,
      total,
      page: filters.page,
      limit: filters.limit
    };
  },

  async updateTutorVerification(tutorId: string, status: string) {
    if (!Object.values(VerificationStatus).includes(status as VerificationStatus)) {
      throw new Error('Trạng thái xác thực không hợp lệ');
    }
    return await adminRepository.updateTutorVerificationStatus(tutorId, status as VerificationStatus);
  },

  async getTutorCertificates(tutorId: string) {
    return await adminRepository.getTutorCertificates(tutorId);
  },

  async updateCertificateStatus(certId: string, status: string, adminNote?: string, adminId?: string) {
    if (!Object.values(VerificationStatus).includes(status as VerificationStatus)) {
      throw new Error('Trạng thái duyệt chứng chỉ không hợp lệ');
    }
    return await adminRepository.updateCertificateStatus(certId, status as VerificationStatus, adminNote, adminId);
  },

  async getCourses(query: any) {
    const filters = {
      search: query.search || undefined,
      status: query.status || undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };
    const { courses, total } = await adminRepository.getCourses(filters);
    return {
      courses,
      total,
      page: filters.page,
      limit: filters.limit
    };
  },

  async updateCourseStatus(courseId: string, status: string) {
    if (!Object.values(CourseStatus).includes(status as CourseStatus)) {
      throw new Error('Trạng thái khóa học không hợp lệ');
    }
    return await adminRepository.updateCourseStatus(courseId, status as CourseStatus);
  },

  async getTransactions(query: any) {
    const filters = {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };
    const { transactions, total } = await adminRepository.getTransactions(filters);
    return {
      transactions,
      total,
      page: filters.page,
      limit: filters.limit
    };
  },

  async getPayouts(query: any) {
    const filters = {
      status: query.status || undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    };
    const { payouts, total } = await adminRepository.getPayouts(filters);
    return {
      payouts,
      total,
      page: filters.page,
      limit: filters.limit
    };
  },

  async updatePayoutStatus(payoutId: string, status: string, adminId?: string) {
    if (!Object.values(PayoutStatus).includes(status as PayoutStatus)) {
      throw new Error('Trạng thái rút tiền không hợp lệ');
    }
    return await adminRepository.updatePayoutStatus(payoutId, status as PayoutStatus, adminId);
  }
};
