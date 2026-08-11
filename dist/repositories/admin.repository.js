"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRepository = void 0;
const prisma_1 = require("../config/prisma");
function formatUserWithProfile(user) {
    if (!user)
        return user;
    const profile = user.admin_profile || user.student_profile || user.tutor_profile;
    const rawName = profile?.full_name;
    const displayName = (rawName && rawName !== 'Người dùng') ? rawName : (user.email ? user.email.split('@')[0] : 'Người dùng');
    return {
        ...user,
        full_name: displayName,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        date_of_birth: profile?.date_of_birth || null,
        gender: profile?.gender || null,
        cccd: user.admin_profile?.cccd || null,
        position: user.admin_profile?.position || null
    };
}
exports.adminRepository = {
    // 1. Dashboard Stats
    async getDashboardStats() {
        const totalStudents = await prisma_1.prisma.studentProfile.count();
        const totalTutors = await prisma_1.prisma.tutorProfile.count();
        const totalCourses = await prisma_1.prisma.course.count({
            where: { NOT: { status: 'archived' } }
        });
        const revenueResult = await prisma_1.prisma.booking.aggregate({
            where: { status: { in: ['confirmed', 'completed'] } },
            _sum: { total_amount: true }
        });
        const bookingRevenue = revenueResult._sum.total_amount ? Number(revenueResult._sum.total_amount) : 0;
        // Tính thêm hoa hồng nhận lớp offline từ bảng transactions
        const commissionRevenueResult = await prisma_1.prisma.transaction.aggregate({
            where: {
                status: 'success',
                description: { contains: 'Phí nhận lớp', mode: 'insensitive' }
            },
            _sum: { amount: true }
        });
        const commissionRevenue = commissionRevenueResult._sum.amount ? Number(commissionRevenueResult._sum.amount) : 0;
        const totalRevenue = bookingRevenue + commissionRevenue;
        const topTutors = await prisma_1.prisma.tutorProfile.findMany({
            orderBy: { rating: 'desc' },
            take: 5,
            include: {
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });
        const totalBookings = await prisma_1.prisma.booking.count();
        const completedBookings = await prisma_1.prisma.booking.count({
            where: { status: 'completed' }
        });
        const cancelledBookings = await prisma_1.prisma.booking.count({
            where: { status: 'cancelled' }
        });
        const completionRate = totalBookings > 0
            ? Math.round((completedBookings / totalBookings) * 100)
            : 0;
        return {
            totalStudents,
            totalTutors,
            totalCourses,
            totalRevenue,
            completionRate,
            bookingStats: {
                total: totalBookings,
                completed: completedBookings,
                cancelled: cancelledBookings
            },
            topTutors: topTutors.map(t => ({
                tutor_id: t.tutor_id,
                name: t.full_name || t.user?.email || 'N/A',
                email: t.user?.email || 'N/A',
                avatar_url: t.avatar_url || null,
                rating: t.rating ? Number(t.rating) : 0,
                experience_years: t.experience_years || 0
            }))
        };
    },
    // 2. User Management
    async getUsers(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (filters.role) {
            whereClause.role = filters.role;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.search) {
            whereClause.OR = [
                { student_profile: { full_name: { contains: filters.search, mode: 'insensitive' } } },
                { tutor_profile: { full_name: { contains: filters.search, mode: 'insensitive' } } },
                { admin_profile: { full_name: { contains: filters.search, mode: 'insensitive' } } },
                { email: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const [users, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.findMany({
                where: whereClause,
                include: {
                    admin_profile: true,
                    student_profile: true,
                    tutor_profile: {
                        include: {
                            certificates: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.user.count({ where: whereClause })
        ]);
        return { users: users.map(formatUserWithProfile), total };
    },
    async updateUserStatus(userId, status) {
        return await prisma_1.prisma.user.update({
            where: { user_id: userId },
            data: { status }
        });
    },
    async updateUserRole(userId, role) {
        const updatedUser = await prisma_1.prisma.user.update({
            where: { user_id: userId },
            data: { role }
        });
        // Ensure profiles are created when role changes
        if (role === 'tutor') {
            await prisma_1.prisma.tutorProfile.upsert({
                where: { user_id: userId },
                create: { user_id: userId },
                update: {}
            });
        }
        else if (role === 'student') {
            await prisma_1.prisma.studentProfile.upsert({
                where: { user_id: userId },
                create: { user_id: userId },
                update: {}
            });
        }
        else if (role === 'admin') {
            await prisma_1.prisma.adminProfile.upsert({
                where: { user_id: userId },
                create: { user_id: userId, full_name: 'Admin' },
                update: {}
            });
        }
        return updatedUser;
    },
    // 3. Tutor Profile & Certificate Verification
    async getTutors(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (filters.verifiedStatus) {
            whereClause.verified_status = filters.verifiedStatus;
        }
        const [tutors, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.tutorProfile.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    },
                    certificates: true
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.tutorProfile.count({ where: whereClause })
        ]);
        const mappedTutors = tutors.map((t) => {
            if (t.user) {
                t.user.full_name = t.full_name || '';
                t.user.avatar_url = t.avatar_url || null;
                t.user.phone = t.phone || null;
            }
            return t;
        });
        return { tutors: mappedTutors, total };
    },
    async updateTutorVerificationStatus(tutorId, status) {
        const profile = await prisma_1.prisma.tutorProfile.update({
            where: { tutor_id: tutorId },
            data: { verified_status: status }
        });
        // Automatically update pending certificates matching the profile status
        if (status === 'approved') {
            await prisma_1.prisma.tutorCertificate.updateMany({
                where: { tutor_id: tutorId, status: 'pending' },
                data: { status: 'approved' }
            });
        }
        else if (status === 'rejected') {
            await prisma_1.prisma.tutorCertificate.updateMany({
                where: { tutor_id: tutorId, status: 'pending' },
                data: { status: 'rejected' }
            });
        }
        return profile;
    },
    async getTutorCertificates(tutorId) {
        return await prisma_1.prisma.tutorCertificate.findMany({
            where: { tutor_id: tutorId }
        });
    },
    async updateCertificateStatus(certId, status, adminNote, adminId) {
        const updatePayload = { status };
        if (adminNote !== undefined)
            updatePayload.admin_note = adminNote;
        if (adminId)
            updatePayload.verified_by_admin = adminId;
        return await prisma_1.prisma.tutorCertificate.update({
            where: { cert_id: certId },
            data: updatePayload
        });
    },
    // 4. Course Moderation
    async getCourses(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.search) {
            whereClause.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { subject: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const [courses, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.course.findMany({
                where: whereClause,
                include: {
                    documents: {
                        orderBy: { created_at: 'asc' }
                    },
                    tutor: {
                        include: {
                            user: {
                                select: {
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.course.count({ where: whereClause })
        ]);
        const mappedCourses = courses.map((c) => {
            if (c.tutor?.user) {
                c.tutor.user.full_name = c.tutor.full_name || '';
                c.tutor.user.avatar_url = c.tutor.avatar_url || null;
            }
            return c;
        });
        return { courses: mappedCourses, total };
    },
    async updateCourseStatus(courseId, status) {
        return await prisma_1.prisma.course.update({
            where: { course_id: courseId },
            data: { status }
        });
    },
    // 5. Payments & Payouts History
    async getTransactions(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const [transactions, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.transaction.findMany({
                include: {
                    user: {
                        select: {
                            email: true,
                            student_profile: { select: { full_name: true } },
                            tutor_profile: { select: { full_name: true } },
                            admin_profile: { select: { full_name: true } }
                        }
                    },
                    booking: {
                        include: {
                            course: {
                                select: {
                                    title: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.transaction.count()
        ]);
        const mappedTransactions = transactions.map((t) => {
            if (t.user) {
                const profile = t.user.admin_profile || t.user.student_profile || t.user.tutor_profile;
                t.user.full_name = profile?.full_name || '';
            }
            return t;
        });
        return { transactions: mappedTransactions, total };
    },
    async getPayouts(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (filters.status) {
            whereClause.status = filters.status;
        }
        const [payouts, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.payout.findMany({
                where: whereClause,
                include: {
                    tutor: {
                        include: {
                            user: {
                                select: {
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.payout.count({ where: whereClause })
        ]);
        const mappedPayouts = payouts.map((p) => {
            if (p.tutor?.user) {
                p.tutor.user.full_name = p.tutor.full_name || '';
            }
            return p;
        });
        return { payouts: mappedPayouts, total };
    },
    async updatePayoutStatus(payoutId, status, adminId) {
        const payout = await prisma_1.prisma.payout.findUnique({
            where: { payout_id: payoutId }
        });
        if (!payout) {
            throw new Error('Payout request not found');
        }
        if (payout.status !== 'pending') {
            throw new Error('Yêu cầu rút tiền này đã được xử lý trước đó.');
        }
        // Nếu duyệt thành công (completed), tiến hành trừ tiền ví của gia sư
        if (status === 'completed') {
            const tutor = await prisma_1.prisma.tutorProfile.findUnique({
                where: { tutor_id: payout.tutor_id }
            });
            if (!tutor) {
                throw new Error('Không tìm thấy thông tin gia sư liên quan đến yêu cầu này.');
            }
            const wallet = await prisma_1.prisma.wallet.findUnique({
                where: { user_id: tutor.user_id }
            });
            if (!wallet || Number(wallet.balance) < Number(payout.amount)) {
                throw new Error('Số dư ví của gia sư không đủ để duyệt yêu cầu rút tiền này.');
            }
            // Trừ tiền khỏi ví gia sư
            await prisma_1.prisma.wallet.update({
                where: { user_id: tutor.user_id },
                data: { balance: { decrement: payout.amount } }
            });
        }
        const updatedPayout = await prisma_1.prisma.payout.update({
            where: { payout_id: payoutId },
            data: {
                status,
                processed_at: new Date()
            }
        });
        return updatedPayout;
    }
};
