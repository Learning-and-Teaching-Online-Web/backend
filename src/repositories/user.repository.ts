import { prisma } from '../config/prisma';

export const userRepository = {
  // Tìm kiếm thông tin user theo Email
  async findByEmail(email: string) {
    const user = await (prisma.user as any).findUnique({
      where: { email },
      include: {
        admin_profile: true,
        student_profile: true,
        tutor_profile: true
      }
    });

    if (!user) return null;

    const profile = user.admin_profile || user.student_profile || user.tutor_profile;

    return {
      ...user,
      full_name: profile?.full_name || '',
      phone: profile?.phone || null,
      avatar_url: profile?.avatar_url || null,
      date_of_birth: profile?.date_of_birth || null,
      gender: profile?.gender || null,
      bio: profile?.bio || null,
      cccd: user.admin_profile?.cccd || null
    };
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
    cccd?: string;
  }) {
    const role = data.role || 'student';

    const user = await (prisma.user as any).create({
      data: {
        email: data.email,
        password: data.password,
        role: role
      }
    });

    if (role === 'student') {
      await (prisma.studentProfile as any).upsert({
        where: { user_id: user.user_id },
        update: {
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth
        },
        create: {
          user_id: user.user_id,
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth
        }
      });
    } else if (role === 'tutor') {
      await (prisma.tutorProfile as any).upsert({
        where: { user_id: user.user_id },
        update: {
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth
        },
        create: {
          user_id: user.user_id,
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth
        }
      });
    } else if (role === 'admin') {
      await (prisma.adminProfile as any).upsert({
        where: { user_id: user.user_id },
        update: {
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          cccd: data.cccd
        },
        create: {
          user_id: user.user_id,
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          cccd: data.cccd
        }
      });
    }

    const fullUser = await this.findById(user.user_id);
    return fullUser;
  },

  // Tìm kiếm thông tin profile của user theo ID
  async findById(userId: string) {
    const user = await (prisma.user as any).findUnique({
      where: { user_id: userId },
      include: {
        admin_profile: true,
        student_profile: true,
        tutor_profile: true
      }
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const profile = user.admin_profile || user.student_profile || user.tutor_profile;

    return {
      ...user,
      full_name: profile?.full_name || '',
      phone: profile?.phone || null,
      avatar_url: profile?.avatar_url || null,
      date_of_birth: profile?.date_of_birth || null,
      gender: profile?.gender || null,
      bio: profile?.bio || null,
      cccd: user.admin_profile?.cccd || null,
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
  async updateById(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string; cccd?: string; metadata?: any }) {
    const { metadata, full_name, phone, avatar_url, cccd, ...userData } = data;

    const currentUser = await (prisma.user as any).findUnique({
      where: { user_id: userId },
      select: { role: true }
    });

    const role = currentUser?.role || 'student';

    const profileUpdate: any = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url;

    if (role === 'student') {
      if (metadata) {
        if (metadata.grade_level !== undefined) profileUpdate.grade_level = metadata.grade_level;
        if (metadata.learning_goals !== undefined) profileUpdate.learning_goals = metadata.learning_goals;
        if (metadata.preferred_subjects !== undefined) profileUpdate.preferred_subjects = metadata.preferred_subjects;
        if (metadata.preferred_mode !== undefined) profileUpdate.preferred_mode = metadata.preferred_mode;
        if (metadata.budget_max !== undefined) profileUpdate.budget_max = metadata.budget_max;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await (prisma.studentProfile as any).upsert({
          where: { user_id: userId },
          update: profileUpdate,
          create: {
            user_id: userId,
            full_name: full_name || '',
            phone,
            avatar_url,
            ...profileUpdate
          }
        });
      }
    } else if (role === 'tutor') {
      if (Object.keys(profileUpdate).length > 0) {
        await (prisma.tutorProfile as any).upsert({
          where: { user_id: userId },
          update: profileUpdate,
          create: {
            user_id: userId,
            full_name: full_name || '',
            phone,
            avatar_url
          }
        });
      }
    } else if (role === 'admin') {
      if (cccd !== undefined) profileUpdate.cccd = cccd;
      if (Object.keys(profileUpdate).length > 0) {
        await (prisma.adminProfile as any).upsert({
          where: { user_id: userId },
          update: profileUpdate,
          create: {
            user_id: userId,
            full_name: full_name || '',
            phone,
            avatar_url,
            cccd
          }
        });
      }
    }

    if (Object.keys(userData).length > 0) {
      await (prisma.user as any).update({
        where: { user_id: userId },
        data: userData
      });
    }

    return this.findById(userId);
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