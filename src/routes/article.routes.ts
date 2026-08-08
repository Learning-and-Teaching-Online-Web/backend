import { Router } from 'express';
import { articleController } from '../controllers/article.controller';
import { articleCommentController } from '../controllers/articleComment.controller';
import { articleCategoryController } from '../controllers/articleCategory.controller';
import { verifyAuth, requireRole, requireApprovedTutor } from '../middlewares/auth.middleware';

const articleRoutes = Router();

// Category routes (Must be registered before /:id)
articleRoutes.get('/categories', articleCategoryController.getAll);
articleRoutes.get('/categories/:id', articleCategoryController.getById);
articleRoutes.post('/categories', verifyAuth, requireRole('admin'), articleCategoryController.create);
articleRoutes.put('/categories/:id', verifyAuth, requireRole('admin'), articleCategoryController.update);
articleRoutes.delete('/categories/:id', verifyAuth, requireRole('admin'), articleCategoryController.delete);

// Article CRUD
articleRoutes.get('/', articleController.getAll);
articleRoutes.get('/:id', articleController.getById);

// Comment routes
articleRoutes.get('/:articleId/comments', articleCommentController.getByArticle);
articleRoutes.post('/:articleId/comments', verifyAuth, articleCommentController.create);
articleRoutes.delete('/comments/:commentId', verifyAuth, articleCommentController.delete);

// Protected routes for Admin and Approved Tutor to manage articles
articleRoutes.post('/', verifyAuth, requireApprovedTutor, articleController.create);
articleRoutes.put('/:id', verifyAuth, requireApprovedTutor, articleController.update);
articleRoutes.delete('/:id', verifyAuth, requireApprovedTutor, articleController.delete);

export default articleRoutes;
