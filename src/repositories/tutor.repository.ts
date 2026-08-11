import { prisma } from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';
import { GradeLevel } from '@prisma/client';

function mapGradeIdsToEnums(ids: any[]): GradeLevel[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id: any) => {
    const str = String(id).trim();
    if (Object.values(GradeLevel).includes(str as GradeLevel)) return str as GradeLevel;
    const match = str.match(/(\d+)/);
    if (match) {
      const key = `grade_${match[1]}` as keyof typeof GradeLevel;
      if (key in GradeLevel) return GradeLevel[key];
    }
    return null;
  }).filter(Boolean) as GradeLevel[];
}

function formatTutorUser(tutor: any) {
  if (!tutor) return tutor;
  const rawName = tutor.full_name;
  const displayName = (rawName && rawName !== 'Người dùng') ? rawName : (tutor.user?.email ? tutor.user.email.split('@')[0] : 'Giảng viên');
  tutor.full_name = displayName;
  if (tutor.user) {
    tutor.user.full_name = displayName;
    tutor.user.avatar_url = tutor.avatar_url || null;
    tutor.user.phone = tutor.phone || null;
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
        certificates: {
          orderBy: { created_at: 'desc' }
        },
        courses: {
          where: { status: 'published' },
          select: {
            course_id: true,
            title: true,
            type: true,
            price: true,
            level: true,
            total_sessions: true,
            duration_minutes: true,
            thumbnail_url: true,
            created_at: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!data) return null;

    const result = formatTutorUser(data);

    // Lấy danh sách các lớp offline (ClassRequest & OfflineClass) từ database
    try {
      const tutorCode = (result as any).tutor_code;
      const [requests, activeOfflineClasses] = await Promise.all([
        prisma.classRequest.findMany({
          where: {
            OR: [
              ...(tutorCode ? [{ selected_tutor_code: { equals: tutorCode, mode: 'insensitive' as const } }] : []),
              { applications: { some: { tutor_id: tutorId } } }
            ]
          },
          include: {
            student: {
              select: {
                full_name: true,
                avatar_url: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.offlineClass.findMany({
          where: { tutor_id: tutorId },
          include: {
            student: {
              select: {
                full_name: true,
                avatar_url: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        })
      ]);
      (result as any).offline_classes = [...(activeOfflineClasses || []), ...(requests || [])];
    } catch (err) {
      console.error('Error fetching offline classes for tutor:', err);
      (result as any).offline_classes = [];
    }

    return result;
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
        booked_count: { gt: 0 }
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
    const bookings = await (prisma as any).booking.findMany({
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
    const booking = await (prisma as any).booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        course: { select: { tutor_id: true } }
      }
    });
    if (!booking) throw new Error('Không tìm thấy lượt đặt lớp này');

    // Update booking status
    const updatedBooking = await (prisma as any).booking.update({
      where: { booking_id: bookingId },
      data: { status }
    });

    // If confirmed, make sure schedule is booked and update tutor wallet balance
    if (status === 'confirmed') {
      if (booking.schedule_id) {
        await (prisma as any).courseSchedule.update({
          where: { schedule_id: booking.schedule_id },
          data: { booked_count: { increment: 1 } }
        });
      }

      // Credit wallet of tutor (fetch tutor user_id first)
      const tutor = await (prisma as any).tutorProfile.findUnique({
        where: { tutor_id: booking.course.tutor_id },
        select: { user_id: true }
      });

      if (tutor) {
        const netAmount = Number(booking.total_amount) * 0.9;

        // Find or create wallet
        await (prisma as any).wallet.upsert({
          where: { user_id: tutor.user_id },
          create: { user_id: tutor.user_id, balance: netAmount },
          update: { balance: { increment: netAmount } }
        });

        // Insert mock transaction for learning payment
        await (prisma as any).transaction.create({
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
        await (prisma as any).courseSchedule.update({
          where: { schedule_id: booking.schedule_id },
          data: { booked_count: { decrement: 1 } }
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
      ...walletTransactions.map((tx: any) => {
        const desc = tx.description || '';
        const isExpense = desc.toLowerCase().includes('phí nhận lớp');
        return {
          transaction_id: tx.transaction_id,
          type: (isExpense ? 'expense' : 'earning') as any,
          amount: Number(tx.amount),
          status: tx.status === 'success' ? ('success' as const) : tx.status === 'pending' ? ('pending' as const) : ('failed' as const),
          description: tx.description || 'Học phí nhận từ học sinh',
          created_at: tx.created_at
        };
      }),
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

  // Get tutor profile with certificates and grades
  async getMyProfile(userId: string) {
    const includeClause = {
      certificates: {
        orderBy: { created_at: 'desc' as const }
      },
      available_times: true,
      user: {
        select: {
          email: true
        }
      }
    };

    let profile = await prisma.tutorProfile.findUnique({
      where: { user_id: userId },
      include: includeClause
    });

    if (!profile) {
      const generatedCode = `GS${Math.floor(1000 + Math.random() * 9000)}`;
      // Auto-create tutor profile if missing for tutor role
      profile = await prisma.tutorProfile.create({
        data: {
          user_id: userId,
          tutor_code: generatedCode,
          verified_status: 'pending'
        },
        include: includeClause
      });
    } else if (!profile.tutor_code) {
      const generatedCode = `GS${Math.floor(1000 + Math.random() * 9000)}`;
      profile = await prisma.tutorProfile.update({
        where: { user_id: userId },
        data: { tutor_code: generatedCode },
        include: includeClause
      });
    }

    return formatTutorUser(profile);
  },

  // Update tutor profile fields
  async updateMyProfile(userId: string, data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    hometown?: string;
    current_address?: string;
    id_card_front_url?: string;
    university?: string;
    major?: string;
    graduation_year?: number;
    current_role?: string;
    grades?: any;
    grade_ids?: string[];
    available_times?: any;
    min_salary_requirement?: string;
    experience_years?: number;
    teaching_mode?: any;
  }) {
    const tutor = await this.getMyProfile(userId);

    const updatePayload: any = {};
    if (data.fullName !== undefined || (data as any).full_name !== undefined) {
      updatePayload.full_name = data.fullName || (data as any).full_name;
    }
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.avatarUrl !== undefined || (data as any).avatar_url !== undefined) {
      updatePayload.avatar_url = data.avatarUrl || (data as any).avatar_url;
    }
    if ((data as any).dateOfBirth !== undefined || (data as any).date_of_birth !== undefined) {
      const dob = (data as any).dateOfBirth || (data as any).date_of_birth;
      updatePayload.date_of_birth = dob ? new Date(dob) : null;
    }
    if ((data as any).gender !== undefined) updatePayload.gender = (data as any).gender;
    if (data.hometown !== undefined) updatePayload.hometown = data.hometown;
    if (data.current_address !== undefined || (data as any).currentAddress !== undefined) {
      updatePayload.current_address = data.current_address || (data as any).currentAddress;
    }
    if (data.id_card_front_url !== undefined) updatePayload.id_card_front_url = data.id_card_front_url;
    if (data.university !== undefined) updatePayload.university = data.university;
    if (data.major !== undefined) updatePayload.major = data.major;
    if (data.graduation_year !== undefined || (data as any).graduationYear !== undefined) {
      updatePayload.graduation_year = Number(data.graduation_year || (data as any).graduationYear);
    }
    if (data.current_role !== undefined || (data as any).currentRole !== undefined) {
      updatePayload.current_role = data.current_role || (data as any).currentRole;
    }

    if (data.min_salary_requirement !== undefined || (data as any).minSalaryRequirement !== undefined) {
      updatePayload.min_salary_requirement = data.min_salary_requirement || (data as any).minSalaryRequirement;
    }
    if (data.experience_years !== undefined || (data as any).experienceYears !== undefined) {
      updatePayload.experience_years = Number(data.experience_years ?? (data as any).experienceYears);
    }
    if (data.teaching_mode !== undefined || (data as any).teachingMode !== undefined) {
      updatePayload.teaching_mode = data.teaching_mode || (data as any).teachingMode;
    }

    // Xử lý lưu các khối lớp nhận dạy vào mảng grade_levels (GradeLevel[])
    const gradeIds = data.grade_ids || (Array.isArray(data.grades) ? data.grades : undefined);
    if (gradeIds !== undefined && Array.isArray(gradeIds)) {
      updatePayload.grade_levels = mapGradeIdsToEnums(gradeIds);
    }

    // Xử lý lưu các khung giờ rảnh dạy vào bảng tutor_available_times
    const availableTimes = data.available_times || (data as any).availableTimes;
    if (availableTimes !== undefined && Array.isArray(availableTimes)) {
      await prisma.tutorAvailableTime.deleteMany({
        where: { tutor_id: tutor.tutor_id }
      });

      if (availableTimes.length > 0) {
        await prisma.tutorAvailableTime.createMany({
          data: availableTimes.map((item: any) => ({
            tutor_id: tutor.tutor_id,
            day_of_week: item.day_of_week || item.dayOfWeek,
            time_slot: item.time_slot || item.timeSlot
          }))
        });
      }
    }

    const updatedProfile = await prisma.tutorProfile.update({
      where: { tutor_id: tutor.tutor_id },
      data: updatePayload,
      include: {
        certificates: {
          orderBy: { created_at: 'desc' }
        },
        available_times: true,
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

  // Get ClassSessions (Tạm thời không dùng)
  async getClassSessions(_tutorId: string) {
    return [];
  }
};

