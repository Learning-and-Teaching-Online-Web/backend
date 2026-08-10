import { prisma } from '../config/prisma';
import { AdminPosition } from '@prisma/client';

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
    const rawName = profile?.full_name;
    const displayName = (rawName && rawName !== 'Người dùng') ? rawName : email.split('@')[0];

    return {
      ...user,
      full_name: displayName,
      phone: profile?.phone || null,
      avatar_url: profile?.avatar_url || null,
      date_of_birth: profile?.date_of_birth || null,
      gender: profile?.gender || null,
      cccd: user.admin_profile?.cccd || null,
      position: user.admin_profile?.position || null
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
    position?: AdminPosition;
    social_provider?: string;
    social_id?: string;
  }) {
    const role = data.role || 'student';

    const user = await (prisma.user as any).create({
      data: {
        email: data.email,
        password: data.password,
        role: role,
        social_provider: data.social_provider || 'local',
        social_id: data.social_id || null
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
      const generatedCode = `GS${Math.floor(1000 + Math.random() * 9000)}`;
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
          tutor_code: generatedCode,
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
          cccd: data.cccd,
          position: data.position
        },
        create: {
          user_id: user.user_id,
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          cccd: data.cccd,
          position: data.position
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
        student_profile: {
          include: { grade: true }
        },
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
      position: user.admin_profile?.position || null,
      metadata: user.student_profile ? {
        address_detail: user.student_profile.address_detail,
        province: user.student_profile.province,
        district: user.student_profile.district,
        grade_level: user.student_profile.grade?.name || null,
        academic_level: user.student_profile.academic_level,
      } : undefined
    };
  },

  // Cập nhật thông tin user theo ID
  async updateById(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string; gender?: string; date_of_birth?: any; cccd?: string; position?: AdminPosition; metadata?: any }) {
    const { metadata, full_name, phone, avatar_url, gender, date_of_birth, cccd, position, ...userData } = data;

    const currentUser = await (prisma.user as any).findUnique({
      where: { user_id: userId },
      select: { role: true }
    });

    const role = currentUser?.role || 'student';

    const profileUpdate: any = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url;
    if (gender !== undefined) profileUpdate.gender = gender;
    if (date_of_birth !== undefined) profileUpdate.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;

    if (role === 'student') {
      if (metadata) {
        if (metadata.address_detail !== undefined) profileUpdate.address_detail = metadata.address_detail;
        if (metadata.province !== undefined) profileUpdate.province = metadata.province;
        if (metadata.district !== undefined) profileUpdate.district = metadata.district;
        if (metadata.academic_level !== undefined) profileUpdate.academic_level = metadata.academic_level;

        if (metadata.grade_level) {
          const matchedGrade = await (prisma.grade as any).findUnique({
            where: { name: metadata.grade_level }
          });
          if (matchedGrade) {
            profileUpdate.grade_id = matchedGrade.grade_id;
          }
        }
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
      if (position !== undefined) profileUpdate.position = position;
      if (Object.keys(profileUpdate).length > 0) {
        await (prisma.adminProfile as any).upsert({
          where: { user_id: userId },
          update: profileUpdate,
          create: {
            user_id: userId,
            full_name: full_name || '',
            phone,
            avatar_url,
            cccd,
            position
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
  },

  // Token helper methods cho verification & reset password
  async findByVerificationToken(token: string) {
    return (prisma.user as any).findFirst({
      where: { verification_token: token },
      include: {
        admin_profile: true,
        student_profile: true,
        tutor_profile: true
      }
    });
  },

  async findByResetToken(token: string) {
    return (prisma.user as any).findFirst({
      where: { reset_token: token },
      include: {
        admin_profile: true,
        student_profile: true,
        tutor_profile: true
      }
    });
  },

  async updateUserVerificationToken(userId: string, token: string | null, expiresAt: Date | null) {
    return (prisma.user as any).update({
      where: { user_id: userId },
      data: {
        verification_token: token,
        verification_token_expires: expiresAt
      }
    });
  },

  async updateUserResetToken(userId: string, token: string | null, expiresAt: Date | null) {
    return (prisma.user as any).update({
      where: { user_id: userId },
      data: {
        reset_token: token,
        reset_token_expires: expiresAt
      }
    });
  },

  async updateUserEmailVerified(userId: string, verified: boolean) {
    return (prisma.user as any).update({
      where: { user_id: userId },
      data: {
        email_verified: verified,
        verification_token: null,
        verification_token_expires: null
      }
    });
  },

  async updateUserPassword(userId: string, hashedPassword: string) {
    return (prisma.user as any).update({
      where: { user_id: userId },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      }
    });
  },

  async updateSocialInfo(userId: string, provider: string, socialId: string) {
    return (prisma.user as any).update({
      where: { user_id: userId },
      data: {
        social_provider: provider,
        social_id: socialId,
        email_verified: true
      }
    });
  }
};
