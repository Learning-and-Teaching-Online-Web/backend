"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tutorRepository = void 0;
const prisma_1 = require("../config/prisma");
const supabase_1 = require("../config/supabase");
function formatTutorUser(tutor) {
    if (!tutor)
        return tutor;
    if (tutor.user) {
        const profile = tutor.user.user_profile;
        tutor.user.full_name = profile?.full_name || '';
        tutor.user.avatar_url = profile?.avatar_url || null;
        tutor.user.phone = profile?.phone || null;
        tutor.user.bio = profile?.bio || null;
    }
    return tutor;
}
exports.tutorRepository = {
    async findByUserId(userId) {
        const data = await prisma_1.prisma.tutorProfile.findUnique({
            where: { user_id: userId },
            include: {
                user: {
                    select: {
                        email: true,
                        user_profile: {
                            select: { full_name: true, avatar_url: true, phone: true, bio: true }
                        }
                    }
                }
            }
        });
        return formatTutorUser(data);
    },
    async findById(tutorId) {
        const data = await prisma_1.prisma.tutorProfile.findUnique({
            where: { tutor_id: tutorId },
            include: {
                user: {
                    select: {
                        email: true,
                        user_profile: {
                            select: { full_name: true, avatar_url: true, phone: true, bio: true }
                        }
                    }
                }
            }
        });
        return formatTutorUser(data);
    },
    async findAll() {
        const data = await prisma_1.prisma.tutorProfile.findMany({
            where: {
                verified_status: 'approved',
                user: {
                    status: 'active'
                }
            },
            orderBy: { rating: 'desc' },
            include: {
                user: {
                    select: {
                        email: true,
                        user_profile: {
                            select: { full_name: true, avatar_url: true, phone: true, bio: true }
                        }
                    }
                }
            }
        });
        return (data || []).map(formatTutorUser);
    },
    // Calculate statistics for the Tutor Dashboard
    async getStats(tutorId) {
        const coursesCount = await prisma_1.prisma.course.count({
            where: {
                tutor_id: tutorId,
                NOT: { status: 'archived' }
            }
        });
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                course: { tutor_id: tutorId }
            }
        });
        // Count unique student profiles with successful/confirmed bookings
        const uniqueStudents = new Set(bookings
            .filter((b) => ['confirmed', 'completed'].includes(b.status))
            .map((b) => b.student_id));
        // Sum total earnings (total amount of confirmed/completed bookings)
        const totalEarnings = bookings
            .filter((b) => ['confirmed', 'completed'].includes(b.status))
            .reduce((sum, b) => sum + Number(b.total_amount) * 0.9, 0); // 10% platform fee deducted
        const tutor = await prisma_1.prisma.tutorProfile.findUnique({
            where: { tutor_id: tutorId },
            select: { rating: true }
        });
        const activeSchedulesCount = await prisma_1.prisma.courseSchedule.count({
            where: {
                course: { tutor_id: tutorId },
                is_booked: true
            }
        });
        return {
            totalCourses: coursesCount,
            totalStudents: uniqueStudents.size,
            totalEarnings,
            averageRating: tutor?.rating ? Number(tutor.rating) : 0,
            activeSchedules: activeSchedulesCount
        };
    },
    // Fetch bookings for courses owned by this tutor
    async getBookings(tutorId) {
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                course: { tutor_id: tutorId }
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                email: true,
                                user_profile: {
                                    select: { full_name: true, avatar_url: true }
                                }
                            }
                        }
                    }
                },
                course: {
                    select: {
                        title: true
                    }
                },
                schedule: {
                    select: {
                        start_time: true,
                        end_time: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
        return bookings.map((b) => {
            if (b.student?.user) {
                b.student.user.full_name = b.student.user.user_profile?.full_name || '';
                b.student.user.avatar_url = b.student.user.user_profile?.avatar_url || null;
            }
            return b;
        });
    },
    // Update a student booking status and optionally lock schedule
    async updateBookingStatus(bookingId, status) {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                course: { select: { tutor_id: true } }
            }
        });
        if (!booking)
            throw new Error('Không tìm thấy lượt đặt lớp này');
        // Update booking status
        const updatedBooking = await prisma_1.prisma.booking.update({
            where: { booking_id: bookingId },
            data: { status }
        });
        // If confirmed, make sure schedule is booked and update tutor wallet balance
        if (status === 'confirmed') {
            if (booking.schedule_id) {
                await prisma_1.prisma.courseSchedule.update({
                    where: { schedule_id: booking.schedule_id },
                    data: { is_booked: true }
                });
            }
            // Credit wallet of tutor (fetch tutor user_id first)
            const tutor = await prisma_1.prisma.tutorProfile.findUnique({
                where: { tutor_id: booking.course.tutor_id },
                select: { user_id: true }
            });
            if (tutor) {
                const netAmount = Number(booking.total_amount) * 0.9;
                // Find or create wallet
                await prisma_1.prisma.wallet.upsert({
                    where: { user_id: tutor.user_id },
                    create: { user_id: tutor.user_id, balance: netAmount },
                    update: { balance: { increment: netAmount } }
                });
                // Insert mock transaction for learning payment
                await prisma_1.prisma.transaction.create({
                    data: {
                        booking_id: bookingId,
                        user_id: tutor.user_id,
                        amount: netAmount,
                        status: 'success',
                        payment_method: 'wallet'
                    }
                });
            }
        }
        else if (status === 'cancelled') {
            if (booking.schedule_id) {
                await prisma_1.prisma.courseSchedule.update({
                    where: { schedule_id: booking.schedule_id },
                    data: { is_booked: false }
                });
            }
        }
        return updatedBooking;
    },
    // Fetch reviews left for this tutor
    async getReviews(tutorId) {
        const reviews = await prisma_1.prisma.review.findMany({
            where: { tutor_id: tutorId, is_visible: true },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                email: true,
                                user_profile: {
                                    select: { full_name: true, avatar_url: true }
                                }
                            }
                        }
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
            orderBy: {
                created_at: 'desc'
            }
        });
        return reviews.map((r) => {
            if (r.student?.user) {
                r.student.user.full_name = r.student.user.user_profile?.full_name || '';
                r.student.user.avatar_url = r.student.user.user_profile?.avatar_url || null;
            }
            return r;
        });
    },
    // Fetch wallet balance and combined transaction log
    async getWallet(userId, tutorId) {
        const wallet = await prisma_1.prisma.wallet.findUnique({
            where: { user_id: userId }
        });
        // Get course enrollment transactions
        const walletTransactions = await prisma_1.prisma.transaction.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });
        // Get payouts
        const payouts = await prisma_1.prisma.payout.findMany({
            where: { tutor_id: tutorId },
            orderBy: { created_at: 'desc' }
        });
        // Format transaction structure to align with UI expectations
        const formattedTransactions = [
            ...walletTransactions.map((tx) => ({
                transaction_id: tx.transaction_id,
                type: 'earning',
                amount: Number(tx.amount),
                status: tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'pending' : 'failed',
                description: tx.description || 'Học phí nhận từ học sinh',
                created_at: tx.created_at
            })),
            ...payouts.map((po) => ({
                transaction_id: po.payout_id,
                type: 'withdrawal',
                amount: Number(po.amount),
                status: po.status === 'completed' ? 'success' : po.status === 'pending' ? 'pending' : 'failed',
                description: `Rút tiền về ${po.bank_name || 'Ngân hàng'} (${po.bank_account || ''})`,
                created_at: po.created_at
            }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return {
            balance: wallet ? Number(wallet.balance) : 0,
            transactions: formattedTransactions
        };
    },
    // Create a withdrawal payout request
    async withdrawFunds(userId, tutorId, amount, bankName, bankAccount) {
        const wallet = await prisma_1.prisma.wallet.findUnique({
            where: { user_id: userId }
        });
        if (!wallet || Number(wallet.balance) < amount) {
            throw new Error('Số dư ví không đủ để rút số tiền này.');
        }
        // Deduct wallet balance
        await prisma_1.prisma.wallet.update({
            where: { user_id: userId },
            data: { balance: { decrement: amount } }
        });
        // Create payout record
        const payout = await prisma_1.prisma.payout.create({
            data: {
                tutor_id: tutorId,
                amount: amount,
                period_start: new Date(),
                period_end: new Date(),
                bank_name: bankName,
                bank_account: bankAccount,
                status: 'pending'
            }
        });
        return payout;
    },
    // Get tutor profile with certificates
    async getMyProfile(userId) {
        let profile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { user_id: userId },
            include: {
                certificates: {
                    orderBy: { created_at: 'desc' }
                },
                user: {
                    select: {
                        email: true,
                        user_profile: {
                            select: { full_name: true, phone: true, avatar_url: true, bio: true }
                        }
                    }
                }
            }
        });
        if (!profile) {
            // Auto-create tutor profile if missing for tutor role
            profile = await prisma_1.prisma.tutorProfile.create({
                data: {
                    user_id: userId,
                    verified_status: 'pending'
                },
                include: {
                    certificates: {
                        orderBy: { created_at: 'desc' }
                    },
                    user: {
                        select: {
                            email: true,
                            user_profile: {
                                select: { full_name: true, phone: true, avatar_url: true, bio: true }
                            }
                        }
                    }
                }
            });
        }
        return formatTutorUser(profile);
    },
    // Update tutor profile fields
    async updateMyProfile(userId, data) {
        const tutor = await this.getMyProfile(userId);
        const updatedProfile = await prisma_1.prisma.tutorProfile.update({
            where: { tutor_id: tutor.tutor_id },
            data: {
                education: data.education !== undefined ? data.education : tutor.education,
                experience_years: data.experience_years !== undefined ? Number(data.experience_years) : tutor.experience_years,
                hourly_rate: data.hourly_rate !== undefined ? Number(data.hourly_rate) : tutor.hourly_rate,
                specialties: data.specialties !== undefined ? data.specialties : tutor.specialties,
                teaching_mode: data.teaching_mode !== undefined ? data.teaching_mode : tutor.teaching_mode,
                province: data.province !== undefined ? data.province : tutor.province,
                district: data.district !== undefined ? data.district : tutor.district
            },
            include: {
                certificates: {
                    orderBy: { created_at: 'desc' }
                },
                user: {
                    select: {
                        email: true,
                        user_profile: {
                            select: { full_name: true, phone: true, avatar_url: true, bio: true }
                        }
                    }
                }
            }
        });
        if (data.bio !== undefined) {
            await prisma_1.prisma.userProfile.upsert({
                where: { user_id: userId },
                update: { bio: data.bio },
                create: { user_id: userId, full_name: '', bio: data.bio }
            });
        }
        return formatTutorUser(updatedProfile);
    },
    // Add new certificate for tutor
    async addCertificate(tutorId, data) {
        let finalFileUrl = data.file_url || '';
        // Upload base64 file to Supabase Storage bucket 'certificates' if base64 provided
        if (data.file_base64) {
            try {
                // Ensure 'certificates' bucket exists
                try {
                    await supabase_1.supabaseAdmin.storage.createBucket('certificates', { public: true });
                }
                catch (_) {
                    // Ignore if bucket already exists
                }
                // Parse base64 string
                let base64Data = data.file_base64;
                let contentType = 'application/pdf';
                if (base64Data.includes(';base64,')) {
                    const parts = base64Data.split(';base64,');
                    contentType = parts[0].replace('data:', '') || 'application/pdf';
                    base64Data = parts[1];
                }
                const buffer = Buffer.from(base64Data, 'base64');
                const rawFileName = data.file_name || `cert_${Date.now()}.pdf`;
                const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `${tutorId}/${Date.now()}_${cleanFileName}`;
                const { error: uploadError } = await supabase_1.supabaseAdmin.storage
                    .from('certificates')
                    .upload(storagePath, buffer, {
                    contentType,
                    upsert: true
                });
                if (uploadError) {
                    console.error('Error uploading certificate to Supabase Storage:', uploadError);
                    throw new Error(`Tải file lên Supabase Storage thất bại: ${uploadError.message}`);
                }
                const { data: urlData } = supabase_1.supabaseAdmin.storage
                    .from('certificates')
                    .getPublicUrl(storagePath);
                finalFileUrl = urlData.publicUrl;
            }
            catch (err) {
                console.error('Supabase storage process error:', err);
                throw new Error(err.message || 'Lỗi xử lý file chứng chỉ');
            }
        }
        if (!finalFileUrl) {
            throw new Error('Vui lòng chọn tệp chứng chỉ để tải lên.');
        }
        const cert = await prisma_1.prisma.tutorCertificate.create({
            data: {
                tutor_id: tutorId,
                title: data.title,
                file_url: finalFileUrl,
                file_type: data.file_type || 'PDF',
                issued_by: data.issued_by || null,
                issued_date: data.issued_date ? new Date(data.issued_date) : null,
                expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
                status: 'pending'
            }
        });
        return cert;
    },
    // Delete certificate
    async deleteCertificate(tutorId, certId) {
        const cert = await prisma_1.prisma.tutorCertificate.findFirst({
            where: { cert_id: certId, tutor_id: tutorId }
        });
        if (!cert)
            throw new Error('Không tìm thấy bằng cấp/chứng chỉ này');
        await prisma_1.prisma.tutorCertificate.delete({
            where: { cert_id: certId }
        });
        return true;
    },
    // Get ClassSessions for a tutor via their courses and bookings
    async getClassSessions(tutorId) {
        // We want all ClassSessions that belong to a booking that belongs to a course owned by the tutor
        const sessions = await prisma_1.prisma.classSession.findMany({
            where: {
                booking: {
                    course: {
                        tutor_id: tutorId
                    }
                }
            },
            include: {
                booking: {
                    include: {
                        course: true,
                        student: {
                            include: {
                                user: {
                                    select: {
                                        user_profile: {
                                            select: { full_name: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { scheduled_start: 'asc' }
        });
        return sessions.map((s) => ({
            session_id: s.session_id,
            title: s.title,
            scheduled_start: s.scheduled_start,
            scheduled_end: s.scheduled_end,
            status: s.status,
            room_id: s.room_id,
            course_title: s.booking?.course?.title || '',
            student_name: s.booking?.student?.user?.user_profile?.full_name || 'Học sinh'
        }));
    }
};
