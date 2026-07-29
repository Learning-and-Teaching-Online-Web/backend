import { prisma } from '../config/prisma';

export const userRepository = {
  // Tìm kiếm thông tin user theo Email
  async findByEmail(email: string) {
    return (prisma.user as any).findUnique({
      where: { email },
      include: {
        student_profile: true,
        tutor_profile: true
      }
    });
  },

  // Tạo mới User trực tiếp trong CSDL
  async createUser(data: {
    email: string;
    password?: string;
    full_name: string;
    role?: 'student' | 'tutor' | 'admin';
    phone?: string;
    gender?: string;
    date_of_birth?: Date;
  }) {
    const role = data.role || 'student';

    return (prisma.user as any).create({
      data: {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: role,
        phone: data.phone,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        ...(role === 'student'
          ? { student_profile: { create: {} } }
          : role === 'tutor'
          ? { tutor_profile: { create: {} } }
          : {})
      },
      include: {
        student_profile: true,
        tutor_profile: true
      }
    });
  },

  // Tìm kiếm thông tin profile của user theo ID
  async findById(userId: string) {
    const user = await (prisma.user as any).findUnique({
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

    const user = await (prisma.user as any).update({
      where: { user_id: userId },
      data: userData
    });

    if (metadata) {
      await (prisma.studentProfile as any).upsert({
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
  },

  // Quản lý Refresh Token trong DB
  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return (prisma.refreshToken as any).create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt
      }
    });
  },

  async findRefreshToken(token: string) {
    return (prisma.refreshToken as any).findUnique({
      where: { token },
      include: { user: true }
    });
  },

  async deleteRefreshToken(token: string) {
    return (prisma.refreshToken as any).deleteMany({
      where: { token }
    });
  },

  async deleteUserRefreshTokens(userId: string) {
    return (prisma.refreshToken as any).deleteMany({
      where: { user_id: userId }
    });
  }
};