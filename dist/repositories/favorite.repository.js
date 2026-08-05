"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoriteRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.favoriteRepository = {
    async findStudentProfileByUserId(userId) {
        return await prisma_1.prisma.studentProfile.findUnique({
            where: { user_id: userId }
        });
    },
    async createStudentProfile(userId) {
        return await prisma_1.prisma.studentProfile.create({
            data: { user_id: userId }
        });
    },
    async findFavorite(studentId, tutorId) {
        return await prisma_1.prisma.favorite.findUnique({
            where: {
                student_id_tutor_id: {
                    student_id: studentId,
                    tutor_id: tutorId
                }
            }
        });
    },
    async add(studentId, tutorId) {
        return await prisma_1.prisma.favorite.create({
            data: {
                student_id: studentId,
                tutor_id: tutorId
            }
        });
    },
    async remove(studentId, tutorId) {
        return await prisma_1.prisma.favorite.delete({
            where: {
                student_id_tutor_id: {
                    student_id: studentId,
                    tutor_id: tutorId
                }
            }
        });
    },
    async getFavoritesByStudentId(studentId) {
        const favorites = await prisma_1.prisma.favorite.findMany({
            where: { student_id: studentId },
            include: {
                tutor: {
                    include: {
                        user: {
                            select: {
                                email: true
                            }
                        }
                    }
                }
            }
        });
        return favorites.map((f) => {
            if (f.tutor?.user) {
                f.tutor.user.full_name = f.tutor.full_name || '';
                f.tutor.user.avatar_url = f.tutor.avatar_url || null;
            }
            return f;
        });
    }
};
