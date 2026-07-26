import { Router } from 'express';
import { articleController } from '../controllers/article.controller';
import { articleCommentController } from '../controllers/articleComment.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const articleRoutes = Router();

// Article CRUD
articleRoutes.get('/', articleController.getAll);
articleRoutes.get('/:id', articleController.getById);

// Comment routes
articleRoutes.get('/:articleId/comments', articleCommentController.getByArticle);
articleRoutes.post('/:articleId/comments', verifyAuth, articleCommentController.create);
articleRoutes.delete('/comments/:commentId', verifyAuth, articleCommentController.delete);

// Protected routes for Admin and Tutor to manage articles
articleRoutes.post('/', verifyAuth, requireRole('admin', 'tutor'), articleController.create);
articleRoutes.put('/:id', verifyAuth, requireRole('admin', 'tutor'), articleController.update);
articleRoutes.delete('/:id', verifyAuth, requireRole('admin', 'tutor'), articleController.delete);

export default articleRoutes;
