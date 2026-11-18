import { Router } from 'express';
import { classroomController } from '../controllers/classroom.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const classroomRoutes = Router();

// GET /api/classroom/:scheduleId/access
classroomRoutes.get('/:scheduleId/access', verifyAuth, classroomController.checkAccess);

export default classroomRoutes;
