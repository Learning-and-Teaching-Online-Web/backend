import { Router } from 'express';
import { gradeController } from '../controllers/grade.controller';

const router = Router();

router.get('/', gradeController.getAllGrades);

export default router;
