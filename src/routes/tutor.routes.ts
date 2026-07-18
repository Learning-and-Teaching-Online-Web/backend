import { Router } from 'express';
import { tutorController } from '../controllers/tutor.controller';

const router = Router();

// GET /tutors - Lấy danh sách tất cả giảng viên
router.get('/', tutorController.getAll);

// GET /tutors/:tutorId - Lấy chi tiết giảng viên
router.get('/:tutorId', tutorController.getById);

export default router;
