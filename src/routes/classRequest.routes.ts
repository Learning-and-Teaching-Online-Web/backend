import { Router } from 'express';
import { classRequestController } from '../controllers/classRequest.controller';
import { verifyAuth, optionalAuth } from '../middlewares/auth.middleware';

const classRequestRoutes = Router();

// Student / User protected routes (MUST be defined before /:id)
classRequestRoutes.get('/my-requests', verifyAuth, classRequestController.getMyRequests);
classRequestRoutes.patch('/my-requests/:id', verifyAuth, classRequestController.updateMyRequest);

// Public / General routes
classRequestRoutes.post('/', optionalAuth, classRequestController.create);
classRequestRoutes.get('/open', classRequestController.getOpenClasses);
classRequestRoutes.get('/:id', classRequestController.getDetail);
classRequestRoutes.post('/:id/apply', classRequestController.apply);

export default classRequestRoutes;
