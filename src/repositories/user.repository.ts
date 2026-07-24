import { prisma } from '../config/prisma';

export const userRepository = {

  // Tìm kiếm thông tin profile của user theo ID
  async findById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        student_profile: true,
        tutor_profile: true
      }
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    return {
      ...user,
      metadata: user.student_profile ? {
        grade_level: user.student_profile.grade_level,
        learning_goals: user.student_profile.learning_goals,
        preferred_subjects: user.student_profile.preferred_subjects,
        preferred_mode: user.student_profile.preferred_mode,
        budget_min: user.student_profile.budget_min,
        budget_max: user.student_profile.budget_max
      } : undefined
    };
  },

  // Cập nhật thông tin user theo ID
  async updateById(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string; metadata?: any }) {
    const { metadata, ...userData } = data;

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: userData
    });

    if (metadata) {
      await prisma.studentProfile.upsert({
        where: { user_id: userId },
        update: {
          grade_level: metadata.grade_level,
          learning_goals: metadata.learning_goals,
          preferred_subjects: metadata.preferred_subjects,
          preferred_mode: metadata.preferred_mode,
          budget_max: metadata.budget_max
        },
        create: {
          user_id: userId,
          grade_level: metadata.grade_level,
          learning_goals: metadata.learning_goals,
          preferred_subjects: metadata.preferred_subjects,
          preferred_mode: metadata.preferred_mode,
          budget_max: metadata.budget_max
        }
      });
    }

    return user;
  }

};