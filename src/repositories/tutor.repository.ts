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
  }
};
