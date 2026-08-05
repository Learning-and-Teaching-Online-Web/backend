import { Router } from 'express';
import { classRequestController } from '../controllers/classRequest.controller';

const classRequestRoutes = Router();

// Public routes
classRequestRoutes.post('/', classRequestController.create);
classRequestRoutes.get('/open', classRequestController.getOpenClasses);
classRequestRoutes.get('/:id', classRequestController.getDetail);
classRequestRoutes.post('/:id/apply', classRequestController.apply);

export default classRequestRoutes;
