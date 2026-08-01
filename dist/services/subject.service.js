"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSubjects = getAllSubjects;
const repositories_1 = require("../repositories");
async function getAllSubjects() {
    return await repositories_1.SubjectRepository.findAll();
}
