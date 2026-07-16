import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const quizRoutes = Router();

quizRoutes.use(verifyAuth);

quizRoutes.get('/my-attempts', quizController.getMyAttempts);
quizRoutes.post('/simulate', quizController.simulateAttempt);

export default quizRoutes;
