import { Router } from 'express';
import { classroomController } from '../controllers/classroom.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const classroomRoutes = Router();

// GET /api/classroom/:scheduleId/access
classroomRoutes.get('/:scheduleId/access', verifyAuth, classroomController.checkAccess);

// PATCH /api/classroom/:scheduleId/status
classroomRoutes.patch('/:scheduleId/status', verifyAuth, classroomController.updateStatus);

export default classroomRoutes;

