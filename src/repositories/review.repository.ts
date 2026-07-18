import { prisma } from '../config/prisma';

export const reviewRepository = {
  async findVisibleReviews() {
    return await prisma.review.findMany({
      where: { is_visible: true },
      include: {
        student: {
          include: {
            user: {
              select: {
                full_name: true,
                avatar_url: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
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
    return await prisma.review.create({
      data
    });
  }
};
