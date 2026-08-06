import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';
import courseRoutes from './course.routes';
import bookingRoutes from './booking.routes';
import articleRoutes from './article.routes';
import favoriteRoutes from './favorite.routes';
import quizRoutes from './quiz.routes';
import reviewRoutes from './review.routes';
import tutorRoutes from './tutor.routes';
import adminRoutes from './admin.routes';
import classRequestRoutes from './classRequest.routes';
import referencePriceRoutes from './referencePrice.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRoutes);
rootRouter.use('/subjects', subjectRoutes);
rootRouter.use('/courses', courseRoutes);
rootRouter.use('/bookings', bookingRoutes);
rootRouter.use('/blog', articleRoutes);
rootRouter.use('/favorites', favoriteRoutes);
rootRouter.use('/quizzes', quizRoutes);
rootRouter.use('/reviews', reviewRoutes);
rootRouter.use('/tutors', tutorRoutes);
rootRouter.use('/admin', adminRoutes);
rootRouter.use('/class-requests', classRequestRoutes);
rootRouter.use('/reference-prices', referencePriceRoutes);

export default rootRouter;
