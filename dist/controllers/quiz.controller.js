"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizController = void 0;
const quiz_repository_1 = require("../repositories/quiz.repository");
const prisma_1 = require("../config/prisma");
exports.quizController = {
    async getMyAttempts(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            let student = await quiz_repository_1.quizRepository.findStudentProfileByUserId(userId);
            if (!student) {
                student = await quiz_repository_1.quizRepository.createStudentProfile(userId);
            }
            const attempts = await quiz_repository_1.quizRepository.findAttemptsByStudentId(student.student_id);
            res.status(200).json({ success: true, data: attempts });
        }
        catch (error) {
            console.error('Error in getMyAttempts:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    },
    async simulateAttempt(req, res) {
        try {
            const userId = req.user?.id;
            const { courseId, quizTitle, score, totalPoints, isPassed } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!courseId) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin ID khóa học' });
                return;
            }
            let student = await quiz_repository_1.quizRepository.findStudentProfileByUserId(userId);
            if (!student) {
                student = await quiz_repository_1.quizRepository.createStudentProfile(userId);
            }
            // Create a mock quiz for this course if it doesn't exist
            const quiz = await quiz_repository_1.quizRepository.createMockQuizIfNone(courseId);
            // Insert quiz attempt
            const attempt = await quiz_repository_1.quizRepository.insertAttempt({
                student_id: student.student_id,
                quiz_id: quiz.quiz_id,
                score: score !== undefined ? Number(score) : Number((Math.random() * 5 + 5).toFixed(1)),
                total_points: totalPoints !== undefined ? Number(totalPoints) : 10,
                is_passed: isPassed !== undefined ? Boolean(isPassed) : true,
                completed_at: new Date()
            });
            // Join quiz and course details for response compatibility
            const fullAttempt = await prisma_1.prisma.quizAttempt.findUnique({
                where: { attempt_id: attempt.attempt_id },
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
                }
            });
            res.status(201).json({ success: true, data: fullAttempt });
        }
        catch (error) {
            console.error('Error in simulateAttempt:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    }
};
