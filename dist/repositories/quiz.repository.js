"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.quizRepository = {
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
    async findAttemptsByStudentId(studentId) {
        return await prisma_1.prisma.quizAttempt.findMany({
            where: { student_id: studentId },
            include: {
                quiz: {
                    include: {
                        course: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    },
    async insertAttempt(data) {
        return await prisma_1.prisma.quizAttempt.create({
            data
        });
    },
    async findFirstQuiz() {
        return await prisma_1.prisma.quiz.findFirst();
    },
    async createMockQuizIfNone(courseId) {
        // If no quiz exists in database, let's look up or create a mock quiz for tests
        const existing = await prisma_1.prisma.quiz.findFirst({
            where: { course_id: courseId }
        });
        if (existing)
            return existing;
        return await prisma_1.prisma.quiz.create({
            data: {
                course_id: courseId,
                title: 'Kiểm tra kiến thức cơ bản',
                description: 'Bài kiểm tra nhanh tổng hợp kiến thức cơ bản của khóa học.',
                max_attempts: 5,
                passing_score: 5,
                status: 'published'
            }
        });
    }
};
