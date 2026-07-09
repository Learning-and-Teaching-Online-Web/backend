import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';


const rootRouter = Router();

rootRouter.use('/auth', authRoutes);       
rootRouter.use('/subjects', subjectRoutes);

export default rootRouter;