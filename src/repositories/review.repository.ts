import { prisma } from '../config/prisma';

export const reviewRepository = {
  async findVisibleReviews() {
    const reviews = await prisma.review.findMany({
      where: { is_visible: true },
      include: {
        student: {
          include: {
            user: {
              select: {
                role: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return reviews.map((r: any) => {
      if (r.student?.user) {
        r.student.user.full_name = r.student.full_name || '';
        r.student.user.avatar_url = r.student.avatar_url || null;
      }
      return r;
    });
  },

  async findReviewByBookingId(bookingId: string) {
    return await prisma.review.findUnique({
      where: { booking_id: bookingId }
    });
  },

  async insert(data: {
    booking_id: string;
    student_id: string;
    tutor_id: string;
    rating: number;
    comment?: string;
    professionalism?: number;
    communication?: number;
    punctuality?: number;
  }) {
    const review = await prisma.review.create({
      data
    });

    // Recalculate average rating & count for TutorProfile
    const stats = await prisma.review.aggregate({
      where: { tutor_id: data.tutor_id, is_visible: true },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.tutorProfile.update({
      where: { tutor_id: data.tutor_id },
      data: {
        rating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
        review_count: stats._count.rating || 0
      }
    });

    return review;
  }
};
