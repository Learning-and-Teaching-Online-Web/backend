import { prisma } from "../config/prisma";

export async function findAll() {
  try {
    const data = await prisma.subject.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" }
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}