import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';
import courseRoutes from './course.routes';
<<<<<<< HEAD
import bookingRoutes from './booking.routes';
import articleRoutes from './article.routes';
import favoriteRoutes from './favorite.routes';
import quizRoutes from './quiz.routes';
import reviewRoutes from './review.routes';
=======
>>>>>>> 11921c9 (feat: implement tutor dashboard API endpoints for stats, bookings, reviews, and wallet management)
import tutorRoutes from './tutor.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRoutes);       
rootRouter.use('/subjects', subjectRoutes);
rootRouter.use('/courses', courseRoutes);
<<<<<<< HEAD
rootRouter.use('/bookings', bookingRoutes);
rootRouter.use('/blog', articleRoutes);
rootRouter.use('/favorites', favoriteRoutes);
rootRouter.use('/quizzes', quizRoutes);
rootRouter.use('/reviews', reviewRoutes);
=======
>>>>>>> 11921c9 (feat: implement tutor dashboard API endpoints for stats, bookings, reviews, and wallet management)
rootRouter.use('/tutors', tutorRoutes);

export default rootRouter;