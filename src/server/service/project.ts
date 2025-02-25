"use server";
import { db } from "../db";
import { mongo } from "../mongo";

/**
 * 프로젝트를 생성하고 ProjectUser를 추가하는 트랜잭션 함수
 *
 * @param tx - 데이터베이스 트랜잭션 객체
 * @param validatedProject - 유효성 검사를 통과한 프로젝트 데이터
 * @param userId - 현재 사용자 ID
 * @returns {Promise<Project>} 생성된 프로젝트
 * @throws {Error} 역할을 찾지 못했을 경우 에러를 던짐
 */
export const createProjectTransaction = async (
  validatedProject: any,
  userId: string,
) => {
  try {
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
          user_id: userId,
          role_id: ownerRole.id,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      return project;
    });

    return result;
  } catch (error) {
    console.error(error);
  }
};

/**
 * 기본 페이지와 캔버스를 포함하여 프로젝트를 생성하는 함수
 *
 * @param userId - 프로젝트를 생성하는 사용자 ID
 * @param projectId - 생성된 프로젝트의 UUID (선택적 매개변수)
 * @returns {Promise<any>} 생성된 프로젝트, 페이지 및 캔버스의 정보
 * @throws {Error} 생성 과정에서 발생한 에러를 던짐
 */
export const createProjectWithDefaults = async (
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

      // 4. 기본 레이어 생성 [신규 추가 부분]
      const defaultLayer = await tx.layer.create({
        data: {
          name: "레이어 1",
          index: 0,
          canvas_id: defaultCanvas.id,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      return {
        project: newProject,
        page: defaultPage,
        canvas: defaultCanvas,
        layer: defaultLayer, // 결과에 레이어 추가
      };
    });

    return result;
  } catch (error) {
    console.error("에러가 발생하였습니다:", error);
    throw error;
  }
};
/**
 * 주어진 사용자 ID에 해당하는 프로젝트 목록을 데이터베이스에서 조회합니다.
 *
 * @param {string} userId - 조회할 사용자의 ID
 * @returns {Promise<any[]>} - 사용자가 참여한 프로젝트의 목록, 오류 발생 시 undefined를 반환
 *
 * @throws {Error} - 데이터베이스 조회 중 문제가 발생할 경우 오류를 콘솔에 출력합니다.
 *
 * 이 함수는 다음과 같은 작업을 수행합니다:
 * 1. `db.projectUser.findMany` 메서드를 호출하여 특정 사용자 ID에 해당하는 프로젝트 사용자 관계를 조회합니다.
 * 2. 결과에는 각 프로젝트와의 관계가 포함되어 반환됩니다.
 */
export const selectUserProjects = async (userId: string) => {
  try {
    const result = await db.projectUser.findMany({
      where: {
        user_id: userId,
      },
      include: {
        project: true, // project 관계를 포함하여 조회
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
};
/**
 * 주어진 프로젝트 ID에 해당하는 첫 번째 페이지를 데이터베이스에서 조회합니다.
 *
 * @param {string} projectId - 조회할 프로젝트의 ID
 * @returns {Promise<any>} - 조회된 페이지의 결과, 오류 발생 시 undefined를 반환
 *
 * @throws {Error} - 데이터베이스 조회 중 문제가 발생할 경우 오류를 콘솔에 출력합니다.
 *
 * 이 함수는 다음과 같은 작업을 수행합니다:
 * 1. `mongo.page.findFirst` 메서드를 호출하여 특정 프로젝트 ID에 해당하는 페이지를 조회합니다.
 * 2. 페이지는 인덱스 기준으로 오름차순 정렬되며, 첫 번째 페이지를 가져옵니다.
 * 3. 각 페이지의 캔버스도 인덱스 기준으로 오름차순 정렬하여 첫 번째 캔버스를 포함합니다.
 */
export const selectInitialProjectUrl = async (projectId: string) => {
  try {
    const result = await mongo.page.findFirst({
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
    return result;
  } catch (error) {
    console.error(error);
  }
};
