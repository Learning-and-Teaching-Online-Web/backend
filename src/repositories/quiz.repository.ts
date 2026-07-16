import { prisma } from '../config/prisma';

export const quizRepository = {
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

  async findAttemptsByStudentId(studentId: string) {
    return await prisma.quizAttempt.findMany({
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

  async insertAttempt(data: {
    student_id: string;
    quiz_id: string;
    score: number;
    total_points: number;
    is_passed: boolean;
    answers_json?: any;
    duration_seconds?: number;
    completed_at?: Date;
  }) {
    return await prisma.quizAttempt.create({
      data
    });
  },

  async findFirstQuiz() {
    return await prisma.quiz.findFirst();
  },

  async createMockQuizIfNone(courseId: string) {
    // If no quiz exists in database, let's look up or create a mock quiz for tests
    const existing = await prisma.quiz.findFirst({
      where: { course_id: courseId }
    });
    if (existing) return existing;

    return await prisma.quiz.create({
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
