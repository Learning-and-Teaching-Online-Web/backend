import { Router } from 'express';
import { referencePriceController } from '../controllers/referencePrice.controller';

const referencePriceRoutes = Router();

referencePriceRoutes.get('/', referencePriceController.getAll);

export default referencePriceRoutes;
