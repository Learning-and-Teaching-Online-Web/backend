import { prisma } from '../config/prisma';

export const tutorRepository = {

  async findByUserId(userId: string) {
    const data = await prisma.tutorProfile.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            full_name: true,
            avatar_url: true,
            email: true
          }
        }
      }
    });

    return data;
  },

  async findById(tutorId: string) {
    const data = await prisma.tutorProfile.findUnique({
      where: { tutor_id: tutorId },
      include: {
        user: {
          select: {
            full_name: true,
            avatar_url: true,
            email: true
          }
        }
      }
    });

    return data;
  },

  async findAll() {
    const data = await prisma.tutorProfile.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            full_name: true,
            avatar_url: true,
            email: true
          }
        }
      }
    });

    return data || [];
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
    return await prisma.booking.findMany({
      where: {
        course: { tutor_id: tutorId }
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                full_name: true,
                email: true,
                avatar_url: true
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
      await prisma.courseSchedule.update({
        where: { schedule_id: booking.schedule_id },
        data: { is_booked: true }
      });

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
      await prisma.courseSchedule.update({
        where: { schedule_id: booking.schedule_id },
        data: { is_booked: false }
      });
    }

    return updatedBooking;
  },

  // Fetch reviews left for this tutor
  async getReviews(tutorId: string) {
    return await prisma.review.findMany({
      where: { tutor_id: tutorId, is_visible: true },
      include: {
        student: {
          include: {
            user: {
              select: {
                full_name: true,
                avatar_url: true
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
  }
};
