import { Router } from "express";
import { SubjectControllers } from "../controllers";

const router = Router();

router.get("/", SubjectControllers.getSubjects);

export default router;