import { Request, Response } from "express";
import * as subjectService from "../services/subject.service";

export async function getSubjects(
  req: Request,
  res: Response
) {

  const { data, error } =
    await subjectService.getAllSubjects();

  if (error) {

    console.error("Error fetching subjects:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  return res.json({
    success: true,
    data
  });
}