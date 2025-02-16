"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { projectSchema, Project } from "~/schemas";
import { ZodError } from "zod";

export const createProject = async (name: string) => {
  const session = await auth();
  try {
    if (!session?.user.id) throw new Error("사용자가 존재하지 않습니다.");

    // 유효성 검사
    const projectData = {
      name,
      uuid: uuidv4(),
      created_user_id: session.user.id,
      updated_user_id: session.user.id,
    };

    const validatedProject = await projectSchema.parseAsync({
      ...projectData,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const project = await db.project.create({
      data: validatedProject,
    });

    const newProject: Project = {
      uuid: project.uuid,
      name: project.name,
      created_at: project.created_at,
      created_user_id: project.created_user_id,
      updated_at: project.updated_at,
      updated_user_id: project.updated_user_id,
    };

    return newProject;
  } catch (error) {
    if (error instanceof ZodError) {
      if (error.errors.length > 0) {
        return error.errors[0]!.message;
      }
    }
  }
};

// 사용자 프로젝트 조회 함수
export const getUserProjects = async (): Promise<Project[]> => {
  const session = await auth();

  try {
    if (!session?.user.id) throw new Error("사용자가 존재하지 않습니다.");

    // 사용자 ID로 프로젝트 조회
    console.log(session.user.id);
    const projects = await db.project.findMany({
      where: { created_user_id: session.user.id },
    });

    return projects.length > 0
      ? projects.map((project) => ({
          uuid: project.uuid,
          name: project.name,
          created_at: project.created_at,
          created_user_id: project.created_user_id,
          updated_at: project.updated_at,
          updated_user_id: project.updated_user_id,
        }))
      : []; // 프로젝트가 없을 경우 빈 배열 반환
  } catch (error: any) {
    return error.message; // 에러 메시지 반환
  }
};
