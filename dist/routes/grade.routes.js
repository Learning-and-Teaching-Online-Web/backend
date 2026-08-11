"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const grade_controller_1 = require("../controllers/grade.controller");
const router = (0, express_1.Router)();
router.get('/', grade_controller_1.gradeController.getAllGrades);
exports.default = router;
