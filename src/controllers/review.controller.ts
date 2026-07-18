import { Request, Response } from 'express';
import { reviewRepository } from '../repositories/review.repository';

export const reviewController = {
  async getVisibleReviews(req: Request, res: Response): Promise<void> {
    try {
      const reviews = await reviewRepository.findVisibleReviews();
      res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
      console.error('Error in getVisibleReviews:', error);
      res.status(500).json({ success: false, error: error.message || error });
    }
  }
};
