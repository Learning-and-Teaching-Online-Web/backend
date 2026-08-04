import { prisma } from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';

function formatTutorUser(tutor: any) {
  if (!tutor) return tutor;
  if (tutor.user) {
    tutor.user.full_name = tutor.full_name || '';
    tutor.user.avatar_url = tutor.avatar_url || null;
    tutor.user.phone = tutor.phone || null;
    tutor.user.bio = tutor.bio || null;
  }
  return tutor;
}

export const tutorRepository = {

  async findByUserId(userId: string) {
    const data = await prisma.tutorProfile.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return formatTutorUser(data);
  },

  async findById(tutorId: string) {
    const data = await prisma.tutorProfile.findUnique({
      where: { tutor_id: tutorId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return formatTutorUser(data);
  },

  async findAll() {
    const data = await prisma.tutorProfile.findMany({
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
            email: true
          }
        }
      }
    });

    return (data || []).map(formatTutorUser);
  },

  // Calculate statistics for the Tutor Dashboard
  async getStats(tutorId: string) {
    const coursesCount = await prisma.course.count({
      where: {
        tutor_id: tutorId,
        NOT: { status: 'archived' }
      }
    });

    const bookings = await prisma.booking.findMany({
      where: {
        course: { tutor_id: tutorId }
      }
    });

    // Count unique student profiles with successful/confirmed bookings
    const uniqueStudents = new Set(
      bookings
        .filter((b: any) => ['confirmed', 'completed'].includes(b.status))
        .map((b: any) => b.student_id)
    );

    // Sum total earnings (total amount of confirmed/completed bookings)
    const totalEarnings = bookings
      .filter((b: any) => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum: number, b: any) => sum + Number(b.total_amount) * 0.9, 0); // 10% platform fee deducted

    const tutor = await prisma.tutorProfile.findUnique({
      where: { tutor_id: tutorId },
      select: { rating: true }
    });

    const activeSchedulesCount = await prisma.courseSchedule.count({
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
  async getBookings(tutorId: string) {
    const bookings = await prisma.booking.findMany({
      where: {
        course: { tutor_id: tutorId }
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true
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

    return bookings.map((b: any) => {
      if (b.student?.user) {
        b.student.user.full_name = b.student.full_name || '';
        b.student.user.avatar_url = b.student.avatar_url || null;
      }
      return b;
    });
  },

  // Update a student booking status and optionally lock schedule
  async updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled' | any) {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        course: { select: { tutor_id: true } }
      }
    });
    if (!booking) throw new Error('Không tìm thấy lượt đặt lớp này');

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { status }
    });

    // If confirmed, make sure schedule is booked and update tutor wallet balance
    if (status === 'confirmed') {
      if (booking.schedule_id) {
        await prisma.courseSchedule.update({
          where: { schedule_id: booking.schedule_id },
          data: { is_booked: true }
        });
      }

      // Credit wallet of tutor (fetch tutor user_id first)
      const tutor = await prisma.tutorProfile.findUnique({
        where: { tutor_id: booking.course.tutor_id },
        select: { user_id: true }
      });

      if (tutor) {
        const netAmount = Number(booking.total_amount) * 0.9;

        // Find or create wallet
        await prisma.wallet.upsert({
          where: { user_id: tutor.user_id },
          create: { user_id: tutor.user_id, balance: netAmount },
          update: { balance: { increment: netAmount } }
        });

        // Insert mock transaction for learning payment
        await prisma.transaction.create({
          data: {
            booking_id: bookingId,
            user_id: tutor.user_id,
            amount: netAmount,
            status: 'success',
            payment_method: 'wallet'
          }
        });
      }
    } else if (status === 'cancelled') {
      if (booking.schedule_id) {
        await prisma.courseSchedule.update({
          where: { schedule_id: booking.schedule_id },
          data: { is_booked: false }
        });
      }
    }


    return updatedBooking;
  },

  // Fetch reviews left for this tutor
  async getReviews(tutorId: string) {
    const reviews = await prisma.review.findMany({
      where: { tutor_id: tutorId, is_visible: true },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true
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

    return reviews.map((r: any) => {
      if (r.student?.user) {
        r.student.user.full_name = r.student.full_name || '';
        r.student.user.avatar_url = r.student.avatar_url || null;
      }
      return r;
    });
  },

  // Fetch wallet balance and combined transaction log
  async getWallet(userId: string, tutorId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId }
    });

    // Get course enrollment transactions
    const walletTransactions = await prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    // Get payouts
    const payouts = await prisma.payout.findMany({
      where: { tutor_id: tutorId },
      orderBy: { created_at: 'desc' }
    });

    // Format transaction structure to align with UI expectations
    const formattedTransactions = [
      ...walletTransactions.map((tx: any) => ({
        transaction_id: tx.transaction_id,
        type: 'earning' as const,
        amount: Number(tx.amount),
        status: tx.status === 'success' ? ('success' as const) : tx.status === 'pending' ? ('pending' as const) : ('failed' as const),
        description: tx.description || 'Học phí nhận từ học sinh',
        created_at: tx.created_at
      })),
      ...payouts.map((po: any) => ({
        transaction_id: po.payout_id,
        type: 'withdrawal' as const,
        amount: Number(po.amount),
        status: po.status === 'completed' ? ('success' as const) : po.status === 'pending' ? ('pending' as const) : ('failed' as const),
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
  async withdrawFunds(userId: string, tutorId: string, amount: number, bankName: string, bankAccount: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId }
    });
    if (!wallet || Number(wallet.balance) < amount) {
      throw new Error('Số dư ví không đủ để rút số tiền này.');
    }

    // Deduct wallet balance
    await prisma.wallet.update({
      where: { user_id: userId },
      data: { balance: { decrement: amount } }
    });

    // Create payout record
    const payout = await prisma.payout.create({
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
  async getMyProfile(userId: string) {
    let profile = await prisma.tutorProfile.findUnique({
      where: { user_id: userId },
      include: {
        certificates: {
          orderBy: { created_at: 'desc' }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!profile) {
      // Auto-create tutor profile if missing for tutor role
      profile = await prisma.tutorProfile.create({
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
              email: true
            }
          }
        }
      });
    }

    return formatTutorUser(profile);
  },

  // Update tutor profile fields
  async updateMyProfile(userId: string, data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    education?: string;
    experience_years?: number;
    hourly_rate?: number;
    specialties?: any;
    teaching_mode?: any;
    province?: string;
    district?: string;
  }) {
    const tutor = await this.getMyProfile(userId);

    const updatePayload: any = {};
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl;
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.education !== undefined) updatePayload.education = data.education;
    if (data.experience_years !== undefined) updatePayload.experience_years = Number(data.experience_years);
    if (data.hourly_rate !== undefined) updatePayload.hourly_rate = Number(data.hourly_rate);
    if (data.specialties !== undefined) updatePayload.specialties = data.specialties;
    if (data.teaching_mode !== undefined) updatePayload.teaching_mode = data.teaching_mode;
    if (data.province !== undefined) updatePayload.province = data.province;
    if (data.district !== undefined) updatePayload.district = data.district;

    const updatedProfile = await prisma.tutorProfile.update({
      where: { tutor_id: tutor.tutor_id },
      data: updatePayload,
      include: {
        certificates: {
          orderBy: { created_at: 'desc' }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return formatTutorUser(updatedProfile);
  },

  // Add new certificate for tutor
  async addCertificate(tutorId: string, data: {
    title: string;
    file_url?: string;
    file_base64?: string;
    file_name?: string;
    file_type?: string;
    issued_by?: string;
    issued_date?: string;
    expiry_date?: string;
  }) {
    let finalFileUrl = data.file_url || '';

    // Upload base64 file to Supabase Storage bucket 'certificates' if base64 provided
    if (data.file_base64) {
      try {
        // Ensure 'certificates' bucket exists
        try {
          await supabaseAdmin.storage.createBucket('certificates', { public: true });
        } catch (_) {
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

        const { error: uploadError } = await supabaseAdmin.storage
          .from('certificates')
          .upload(storagePath, buffer, {
            contentType,
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading certificate to Supabase Storage:', uploadError);
          throw new Error(`Tải file lên Supabase Storage thất bại: ${uploadError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('certificates')
          .getPublicUrl(storagePath);

        finalFileUrl = urlData.publicUrl;
      } catch (err: any) {
        console.error('Supabase storage process error:', err);
        throw new Error(err.message || 'Lỗi xử lý file chứng chỉ');
      }
    }

    if (!finalFileUrl) {
      throw new Error('Vui lòng chọn tệp chứng chỉ để tải lên.');
    }

    const cert = await prisma.tutorCertificate.create({
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
  async deleteCertificate(tutorId: string, certId: string) {
    const cert = await prisma.tutorCertificate.findFirst({
      where: { cert_id: certId, tutor_id: tutorId }
    });
    if (!cert) throw new Error('Không tìm thấy bằng cấp/chứng chỉ này');

    await prisma.tutorCertificate.delete({
      where: { cert_id: certId }
    });

    return true;
  },

  // Get ClassSessions for a tutor via their courses and bookings
  async getClassSessions(tutorId: string) {
    const sessions = await prisma.classSession.findMany({
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
            student: true
          }
        }
      },
      orderBy: { scheduled_start: 'asc' }
    });

    return sessions.map((s: any) => ({
      session_id: s.session_id,
      title: s.title,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end,
      status: s.status,
      room_id: s.room_id,
      course_title: s.booking?.course?.title || '',
      student_name: s.booking?.student?.full_name || 'Học sinh'
    }));
  }
};
