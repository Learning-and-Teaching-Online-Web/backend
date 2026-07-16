import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { quizRepository } from '../repositories/quiz.repository';
import { prisma } from '../config/prisma';

export const quizController = {
  async getMyAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
        return;
      }

      let student = await quizRepository.findStudentProfileByUserId(userId);
      if (!student) {
        student = await quizRepository.createStudentProfile(userId);
      }

      const attempts = await quizRepository.findAttemptsByStudentId(student.student_id);
      res.status(200).json({ success: true, data: attempts });
    } catch (error: any) {
      console.error('Error in getMyAttempts:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  },

  async simulateAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      let student = await quizRepository.findStudentProfileByUserId(userId);
      if (!student) {
        student = await quizRepository.createStudentProfile(userId);
      }

      // Create a mock quiz for this course if it doesn't exist
      const quiz = await quizRepository.createMockQuizIfNone(courseId);

      // Insert quiz attempt
      const attempt = await quizRepository.insertAttempt({
        student_id: student.student_id,
        quiz_id: quiz.quiz_id,
        score: score !== undefined ? Number(score) : Number((Math.random() * 5 + 5).toFixed(1)),
        total_points: totalPoints !== undefined ? Number(totalPoints) : 10,
        is_passed: isPassed !== undefined ? Boolean(isPassed) : true,
        completed_at: new Date()
      });

      // Join quiz and course details for response compatibility
      const fullAttempt = await prisma.quizAttempt.findUnique({
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
    } catch (error: any) {
      console.error('Error in simulateAttempt:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
