import { SubjectRepository } from "../repositories";


export async function getAllSubjects() {

    return await SubjectRepository.findAll();
}