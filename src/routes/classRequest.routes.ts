import { Router } from 'express';
import { classRequestController } from '../controllers/classRequest.controller';
import { verifyAuth, optionalAuth } from '../middlewares/auth.middleware';

const classRequestRoutes = Router();

// Protected routes (MUST be defined before /:id)
classRequestRoutes.get('/my-requests', verifyAuth, classRequestController.getMyRequests);
classRequestRoutes.patch('/my-requests/:id', verifyAuth, classRequestController.updateMyRequest);
classRequestRoutes.post('/', verifyAuth, classRequestController.create);
classRequestRoutes.post('/:id/apply', verifyAuth, classRequestController.apply);

// Public / General routes
classRequestRoutes.get('/open', classRequestController.getOpenClasses);
classRequestRoutes.get('/:id', optionalAuth, classRequestController.getDetail);

export default classRequestRoutes;
