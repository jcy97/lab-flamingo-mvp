"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { projectSchema, Project } from "~/schemas";
import { ZodError } from "zod";
import { mongo } from "~/server/mongo";

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

    // Transaction을 사용하여 Project 생성과 ProjectUser 생성을 atomic하게 처리
    const result = await db.$transaction(async (tx) => {
      // 1. Project 생성
      const project = await tx.project.create({
        data: validatedProject,
      });

      // 2. OWNER Role ID 조회
      const ownerRole = await tx.role.findFirst({
        where: {
          name: "OWNER",
          is_used: 1,
        },
      });

      if (!ownerRole) {
        throw new Error("OWNER 역할을 찾을 수 없습니다.");
      }

      // 3. ProjectUser 생성
      await tx.projectUser.create({
        data: {
          project_id: project.id,
          user_id: session.user.id,
          role_id: ownerRole.id,
          created_user_id: session.user.id,
          updated_user_id: session.user.id,
        },
      });

      return project;
    });

    // 결과 반환
    const newProject: Project = {
      uuid: result.uuid,
      name: result.name,
      created_at: result.created_at,
      created_user_id: result.created_user_id,
      updated_at: result.updated_at,
      updated_user_id: result.updated_user_id,
    };

    return newProject;
  } catch (error) {
    if (error instanceof ZodError) {
      if (error.errors.length > 0) {
        return error.errors[0]!.message;
      }
    }
    throw error; // 다른 에러는 상위로 전파
  }
};

export const getUserProjects = async (): Promise<Project[]> => {
  const session = await auth();

  try {
    if (!session?.user.id) throw new Error("사용자가 존재하지 않습니다.");

    // ProjectUser를 통해 사용자의 프로젝트 조회
    const projectUsers = await db.projectUser.findMany({
      where: {
        user_id: session.user.id,
      },
      include: {
        project: true, // project 관계를 포함하여 조회
      },
    });

    // 프로젝트 정보 매핑
    return projectUsers.length > 0
      ? projectUsers.map((projectUser) => ({
          uuid: projectUser.project.uuid,
          name: projectUser.project.name,
          created_at: projectUser.project.created_at,
          created_user_id: projectUser.project.created_user_id,
          updated_at: projectUser.project.updated_at,
          updated_user_id: projectUser.project.updated_user_id,
        }))
      : []; // 프로젝트가 없을 경우 빈 배열 반환
  } catch (error) {
    if (error instanceof Error) {
      throw error; // 에러를 상위로 전파
    }
    throw new Error("알 수 없는 에러가 발생했습니다.");
  }
};
