import { Router } from 'express';
import { articleController } from '../controllers/article.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const articleRoutes = Router();

articleRoutes.get('/', articleController.getAll);
articleRoutes.get('/:id', articleController.getById);

// Protected routes for Admin and Tutor to manage articles
articleRoutes.post('/', verifyAuth, requireRole('admin', 'tutor'), articleController.create);
articleRoutes.put('/:id', verifyAuth, requireRole('admin', 'tutor'), articleController.update);
articleRoutes.delete('/:id', verifyAuth, requireRole('admin', 'tutor'), articleController.delete);

export default articleRoutes;
