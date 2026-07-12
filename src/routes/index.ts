import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';
import courseRoutes from './course.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRoutes);       
rootRouter.use('/subjects', subjectRoutes);
rootRouter.use('/courses', courseRoutes);

export default rootRouter;