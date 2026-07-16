import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';

const reviewRoutes = Router();

// Public route to fetch student feedbacks/reviews for homepage
reviewRoutes.get('/visible', reviewController.getVisibleReviews);

export default reviewRoutes;
