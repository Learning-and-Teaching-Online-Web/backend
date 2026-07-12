import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const courseRoutes = Router();

// Public routes or general view routes (still passes through authentication if needed, but here they can just be open or standard verifyAuth)
courseRoutes.get('/', courseController.list);
courseRoutes.get('/:id', courseController.detail);

// Tutor protected routes
courseRoutes.post('/', verifyAuth, requireRole('tutor'), courseController.create);
courseRoutes.patch('/:id', verifyAuth, requireRole('tutor'), courseController.update);
courseRoutes.delete('/:id', verifyAuth, requireRole('tutor'), courseController.delete);

// Schedule routes
courseRoutes.post('/:id/schedules', verifyAuth, requireRole('tutor'), courseController.addSchedule);

export default courseRoutes;
