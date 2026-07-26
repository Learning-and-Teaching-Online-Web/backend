import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';

import { verifyAuth } from '../middlewares/auth.middleware';

const reviewRoutes = Router();

// Public route to fetch student feedbacks/reviews for homepage
reviewRoutes.get('/visible', reviewController.getVisibleReviews);

// Protected route to create a new review for a booking
reviewRoutes.post('/', verifyAuth, reviewController.createReview);

export default reviewRoutes;
