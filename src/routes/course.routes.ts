import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { courseCommentController } from '../controllers/courseComment.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const courseRoutes = Router();

// Public routes
courseRoutes.get('/', courseController.list);

// Tutor specific course fetch (must be before /:id)
courseRoutes.get('/my-courses', verifyAuth, requireRole('tutor'), courseController.myCourses);

// Comment routes
courseRoutes.get('/:courseId/comments', courseCommentController.getByCourse);
courseRoutes.post('/:courseId/comments', verifyAuth, courseCommentController.create);
courseRoutes.delete('/comments/:commentId', verifyAuth, courseCommentController.delete);

courseRoutes.get('/:id', courseController.detail);

// Tutor protected routes
courseRoutes.post('/', verifyAuth, requireRole('tutor'), courseController.create);
courseRoutes.patch('/:id', verifyAuth, requireRole('tutor'), courseController.update);
courseRoutes.delete('/:id', verifyAuth, requireRole('tutor'), courseController.delete);

// Schedule routes
courseRoutes.post('/:id/schedules', verifyAuth, requireRole('tutor'), courseController.addSchedule);

export default courseRoutes;
