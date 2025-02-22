"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { projectSchema, Project } from "~/schemas";
import { ZodError } from "zod";
import { mongo } from "~/server/mongo";

/**
 * 프로젝트를 신규 등록한다.
 * 프로젝트 하위에 페이지와 캔버스 기본 데이터도 함께 생성한다.
 * @returns {Promise<Project>} 신규 생성된 프로젝트
 * @throws {Error} 사용자가 존재하지 않거나 알 수 없는 에러가 발생할 경우 에러를 던짐
 */
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

    /*
      프로젝트 기본 정보 저장(Postgres)
    */
    // Transaction을 사용하여 Project 생성과 ProjectUser 생성을 atomic하게 처리
    const result = await db.$transaction(async (tx) => {
      return await createProjectTransaction(
        tx,
        validatedProject,
        session.user.id,
      );
    });

    /*
      협업 상세 정보 저장(몽고 DB)
    */
    await createProjectWithDefaults(session.user.id, result.uuid);

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

/**
 * 사용자의 프로젝트 목록을 조회하는 함수
 *
 * @returns {Promise<Project[]>} 사용자가 소속된 프로젝트의 배열
 * @throws {Error} 사용자가 존재하지 않거나 알 수 없는 에러가 발생할 경우 에러를 던짐
 */

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

/**
 * 주어진 프로젝트 ID에 해당하는 페이지와 가장 작은 캔버스 ID를 가져오는 함수
 * @param {string} projectId - 프로젝트의 ID
 * @returns {Promise<{project_id: string, page_id: string, canvas_id: string | null}>} -
 *          프로젝트 ID, 페이지 ID, 캔버스 ID를 포함한 객체
 */
export const getInitialProjectUrl = async (projectId: string) => {
  // 해당 프로젝트 ID에 대한 페이지를 찾는다.
  const data = await mongo.page.findFirst({
    where: {
      project_id: projectId,
    },
    orderBy: {
      index: "asc",
    },
    include: {
      page_canvases: {
        orderBy: {
          index: "asc",
        },
        take: 1,
      },
    },
  });

  // 필요한 필드만 추출하여 한 레벨로 반환
  if (data) {
    const result = {
      project_id: data.project_id,
      page_id: data.id,
      canvas_id:
        data.page_canvases.length > 0 ? data.page_canvases[0]!.id : null,
    };
    return `/project/${result.project_id}/${result.page_id}/${result.canvas_id}`;
  } else {
    return null;
  }
};

/**
 * 프로젝트를 생성하고 ProjectUser를 추가하는 트랜잭션 함수
 *
 * @param tx - 데이터베이스 트랜잭션 객체
 * @param validatedProject - 유효성 검사를 통과한 프로젝트 데이터
 * @param userId - 현재 사용자 ID
 * @returns {Promise<Project>} 생성된 프로젝트
 * @throws {Error} 역할을 찾지 못했을 경우 에러를 던짐
 */
const createProjectTransaction = async (
  tx: any,
  validatedProject: any,
  userId: string,
) => {
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
      user_id: userId,
      role_id: ownerRole.id,
      created_user_id: userId,
      updated_user_id: userId,
    },
  });

  return project;
};

/**
 * 기본 페이지와 캔버스를 포함하여 프로젝트를 생성하는 함수
 *
 * @param userId - 프로젝트를 생성하는 사용자 ID
 * @param projectId - 생성된 프로젝트의 UUID (선택적 매개변수)
 * @returns {Promise<any>} 생성된 프로젝트, 페이지 및 캔버스의 정보
 * @throws {Error} 생성 과정에서 발생한 에러를 던짐
 */
const createProjectWithDefaults = async (
  userId: string,
  projectId: string, // Optional project name parameter
) => {
  try {
    const result = await mongo.$transaction(async (tx) => {
      // 1. 프로젝트 정보 생성
      const newProject = await tx.project.create({
        data: {
          id: projectId,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      // 2. 기본 페이지 생성
      const defaultPage = await tx.page.create({
        data: {
          name: "페이지 1",
          index: 0,
          project_id: newProject.id,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      // 3. 기본 캔버스 생성
      const defaultCanvas = await tx.canvas.create({
        data: {
          name: "캔버스 1",
          index: 0,
          page_id: defaultPage.id,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      return {
        project: newProject,
        page: defaultPage,
        canvas: defaultCanvas,
      };
    });

    return result;
  } catch (error) {
    console.error("에러가 발생하였습니다:", error);
    throw error;
  }
};
