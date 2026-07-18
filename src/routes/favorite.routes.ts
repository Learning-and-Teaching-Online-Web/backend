import { Router } from 'express';
import { favoriteController } from '../controllers/favorite.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const favoriteRoutes = Router();

favoriteRoutes.use(verifyAuth);

favoriteRoutes.post('/', favoriteController.toggleFavorite);
favoriteRoutes.get('/my-favorites', favoriteController.listMyFavorites);

export default favoriteRoutes;
