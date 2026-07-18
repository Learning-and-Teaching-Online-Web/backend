import { Router } from 'express';
import { articleController } from '../controllers/article.controller';

const articleRoutes = Router();

articleRoutes.get('/', articleController.getAll);
articleRoutes.get('/:id', articleController.getById);

export default articleRoutes;
