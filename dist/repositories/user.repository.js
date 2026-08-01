"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.userRepository = {
    // Tìm kiếm thông tin user theo Email
    async findByEmail(email) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                user_profile: true,
                student_profile: true,
                tutor_profile: true
            }
        });
        if (!user)
            return null;
        return {
            ...user,
            full_name: user.user_profile?.full_name || '',
            phone: user.user_profile?.phone || null,
            avatar_url: user.user_profile?.avatar_url || null,
            date_of_birth: user.user_profile?.date_of_birth || null,
            gender: user.user_profile?.gender || null,
            bio: user.user_profile?.bio || null
        };
    },
    // Tạo mới User trực tiếp trong CSDL
    async createUser(data) {
        const role = data.role || 'student';
        const user = await prisma_1.prisma.user.create({
            data: {
                email: data.email,
                password: data.password,
                role: role
            }
        });
        await prisma_1.prisma.userProfile.upsert({
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
        if (role === 'student') {
            await prisma_1.prisma.studentProfile.upsert({
                where: { user_id: user.user_id },
                update: {},
                create: { user_id: user.user_id }
            });
        }
        else if (role === 'tutor') {
            await prisma_1.prisma.tutorProfile.upsert({
                where: { user_id: user.user_id },
                update: {},
                create: { user_id: user.user_id }
            });
        }
        const fullUser = await this.findById(user.user_id);
        return fullUser;
    },
    // Tìm kiếm thông tin profile của user theo ID
    async findById(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                user_profile: true,
                student_profile: true,
                tutor_profile: true
            }
        });
        if (!user) {
            throw new Error(`User with id ${userId} not found`);
        }
        return {
            ...user,
            full_name: user.user_profile?.full_name || '',
            phone: user.user_profile?.phone || null,
            avatar_url: user.user_profile?.avatar_url || null,
            date_of_birth: user.user_profile?.date_of_birth || null,
            gender: user.user_profile?.gender || null,
            bio: user.user_profile?.bio || null,
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
    async updateById(userId, data) {
        const { metadata, full_name, phone, avatar_url, ...userData } = data;
        const profileUpdate = {};
        if (full_name !== undefined)
            profileUpdate.full_name = full_name;
        if (phone !== undefined)
            profileUpdate.phone = phone;
        if (avatar_url !== undefined)
            profileUpdate.avatar_url = avatar_url;
        if (Object.keys(profileUpdate).length > 0) {
            await prisma_1.prisma.userProfile.upsert({
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
        if (Object.keys(userData).length > 0) {
            await prisma_1.prisma.user.update({
                where: { user_id: userId },
                data: userData
            });
        }
        if (metadata) {
            await prisma_1.prisma.studentProfile.upsert({
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
        return this.findById(userId);
    },
    // Quản lý Refresh Token trong DB
    async saveRefreshToken(userId, token, expiresAt) {
        return prisma_1.prisma.refreshToken.create({
            data: {
                user_id: userId,
                token,
                expires_at: expiresAt
            }
        });
    },
    async findRefreshToken(token) {
        return prisma_1.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true }
        });
    },
    async deleteRefreshToken(token) {
        return prisma_1.prisma.refreshToken.deleteMany({
            where: { token }
        });
    },
    async deleteUserRefreshTokens(userId) {
        return prisma_1.prisma.refreshToken.deleteMany({
            where: { user_id: userId }
        });
    }
};
