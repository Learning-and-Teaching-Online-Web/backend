import { prisma } from '../config/prisma';

export const favoriteRepository = {
  async findStudentProfileByUserId(userId: string) {
    return await prisma.studentProfile.findUnique({
      where: { user_id: userId }
    });
  },

  async createStudentProfile(userId: string) {
    return await prisma.studentProfile.create({
      data: { user_id: userId }
    });
  },

  async findFavorite(studentId: string, tutorId: string) {
    return await prisma.favorite.findUnique({
      where: {
        student_id_tutor_id: {
          student_id: studentId,
          tutor_id: tutorId
        }
      }
    });
  },

  async add(studentId: string, tutorId: string) {
    return await prisma.favorite.create({
      data: {
        student_id: studentId,
        tutor_id: tutorId
      }
    });
  },

  async remove(studentId: string, tutorId: string) {
    return await prisma.favorite.delete({
      where: {
        student_id_tutor_id: {
          student_id: studentId,
          tutor_id: tutorId
        }
      }
    });
  },

  async getFavoritesByStudentId(studentId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { student_id: studentId },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                user_profile: {
                  select: {
                    full_name: true,
                    avatar_url: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return favorites.map((f: any) => {
      if (f.tutor?.user) {
        f.tutor.user.full_name = f.tutor.user.user_profile?.full_name || '';
        f.tutor.user.avatar_url = f.tutor.user.user_profile?.avatar_url || null;
      }
      return f;
    });
  }
};
