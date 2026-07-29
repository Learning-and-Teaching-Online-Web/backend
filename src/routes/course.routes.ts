import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { courseCommentController } from '../controllers/courseComment.controller';
import { documentController } from '../controllers/document.controller';
import { verifyAuth, requireRole, requireApprovedTutor } from '../middlewares/auth.middleware';

const courseRoutes = Router();

// Public routes
courseRoutes.get('/', courseController.list);

// Tutor specific course fetch (must be before /:id)
courseRoutes.get('/my-courses', verifyAuth, requireRole('tutor'), courseController.myCourses);

// Comment routes
courseRoutes.get('/:courseId/comments', courseCommentController.getByCourse);
courseRoutes.post('/:courseId/comments', verifyAuth, courseCommentController.create);
courseRoutes.delete('/comments/:commentId', verifyAuth, courseCommentController.delete);

// Document routes
courseRoutes.get('/:courseId/documents', documentController.getByCourse);
courseRoutes.post('/:courseId/documents', verifyAuth, requireApprovedTutor, documentController.create);
courseRoutes.patch('/documents/:docId', verifyAuth, requireApprovedTutor, documentController.update);
courseRoutes.delete('/documents/:docId', verifyAuth, requireApprovedTutor, documentController.delete);

// Lesson routes (CourseLesson video lectures for Offline courses)
courseRoutes.post('/:id/lessons', verifyAuth, requireApprovedTutor, courseController.addLesson);
courseRoutes.patch('/:id/lessons/:lessonId', verifyAuth, requireApprovedTutor, courseController.updateLesson);
courseRoutes.delete('/:id/lessons/:lessonId', verifyAuth, requireApprovedTutor, courseController.deleteLesson);

courseRoutes.get('/:id', courseController.detail);

// Tutor protected routes
courseRoutes.post('/', verifyAuth, requireApprovedTutor, courseController.create);
courseRoutes.patch('/:id', verifyAuth, requireApprovedTutor, courseController.update);
courseRoutes.delete('/:id', verifyAuth, requireApprovedTutor, courseController.delete);

// Schedule routes
courseRoutes.post('/:id/schedules', verifyAuth, requireApprovedTutor, courseController.addSchedule);

export default courseRoutes;
