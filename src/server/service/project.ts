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
 * 프로젝트 이름을 수정하는 함수
 * @param projectId 수정할 프로젝트의 ID
 * @param newName 변경할 새 프로젝트 이름
 * @param userId 업데이트를 수행하는 사용자 ID
 * @returns 업데이트된 프로젝트 객체
 */
export const updateProjectName = async (
  projectUuid: string,
  newName: string,
  userId: string,
) => {
  try {
    // 프로젝트가 존재하는지 먼저 확인
    const existingProject = await db.project.findUnique({
      where: {
        uuid: projectUuid,
      },
    });

    if (!existingProject) {
      throw new Error(`ID가 ${projectUuid}인 프로젝트를 찾을 수 없습니다.`);
    }

    // 프로젝트 이름 업데이트
    const updatedProject = await db.project.update({
      where: {
        uuid: projectUuid,
      },
      data: {
        name: newName,
        updated_at: new Date(),
        updated_user_id: userId,
      },
    });

    return updatedProject;
  } catch (error) {
    console.error("프로젝트 이름 업데이트 중 오류 발생:", error);
    throw error;
  } finally {
    // 필요하다면 Prisma 연결 해제
    // await prisma.$disconnect();
  }
};

/**
 * 기본 페이지와 캔버스를 포함하여 프로젝트를 생성하는 함수
 *
 * @param userId - 프로젝트를 생성하는 사용자 ID
 * @param projectId - 생성된 프로젝트의 UUID (선택적 매개변수)
 * @returns {Promise<any>} 생성된 프로젝트, 페이지, 캔버스, 레이어 및 레이어 컨텐츠의 정보
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

      // 4. 기본 레이어 생성
      const defaultLayer = await tx.layer.create({
        data: {
          name: "레이어 1",
          index: 0,
          type: "NORMAL", // 명시적으로 NORMAL 타입 설정
          canvas_id: defaultCanvas.id,
          created_user_id: userId,
          updated_user_id: userId,
        },
      });

      // 5. 기본 레이어 컨텐츠 생성 (NORMAL 타입)
      const defaultLayerContent = await tx.layerContent.create({
        data: {
          layer_id: defaultLayer.id,
          position_x: 0,
          position_y: 0,
          rotation: 0,
          normal_data: {}, // 빈 객체로 초기화 (필요에 따라 기본값 설정 가능)
        },
      });

      return {
        project: newProject,
        page: defaultPage,
        canvas: defaultCanvas,
        layer: defaultLayer,
        layerContent: defaultLayerContent, // 결과에 레이어 컨텐츠 추가
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

/**
 * 프로젝트 및 관련 데이터를 완전히 삭제하는 함수
 * @param projectUuid 삭제할 프로젝트의 UUID
 * @returns 삭제 결과 객체
 */
export const deleteProject = async (projectUuid: string) => {
  try {
    // 트랜잭션 시작
    // MongoDB 데이터부터 삭제
    const mongoResult = await deleteMongoDbData(projectUuid);

    // MongoDB 삭제가 성공하면 PostgreSQL 데이터 삭제
    if (mongoResult.success) {
      const postgresResult = await deletePostgresData(projectUuid);

      return {
        success: postgresResult.success,
        message: postgresResult.success
          ? "프로젝트가 성공적으로 삭제되었습니다."
          : `MongoDB 데이터는 삭제되었으나, PostgreSQL 데이터 삭제 중 오류가 발생했습니다: ${postgresResult.error}`,
      };
    } else {
      // MongoDB 삭제 실패 시
      return {
        success: false,
        message: `프로젝트 삭제 중 오류가 발생했습니다: ${mongoResult.error}`,
      };
    }
  } catch (error) {
    console.error("프로젝트 삭제 중 예기치 않은 오류:", error);
    return {
      success: false,
      message: "프로젝트 삭제 중 예기치 않은 오류가 발생했습니다.",
      error,
    };
  }
};

/**
 * MongoDB에서 프로젝트 및 관련 데이터 삭제
 */
const deleteMongoDbData = async (projectUuid: string) => {
  try {
    // MongoDB에서 해당 프로젝트 찾기
    const project = await mongo.project.findUnique({
      where: { id: projectUuid },
      include: {
        project_pages: {
          include: {
            page_canvases: {
              include: {
                canvas_layers: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        error: "해당 UUID의 프로젝트를 MongoDB에서 찾을 수 없습니다.",
      };
    }

    // MongoDB 트랜잭션 시작
    await mongo.$transaction(async (tx) => {
      // 1. 각 레이어 삭제
      for (const page of project.project_pages) {
        for (const canvas of page.page_canvases) {
          // 모든 레이어 삭제
          await tx.layer.deleteMany({
            where: { canvas_id: canvas.id },
          });

          // 캔버스 삭제
          await tx.canvas.delete({
            where: { id: canvas.id },
          });
        }

        // 페이지 삭제
        await tx.page.delete({
          where: { id: page.id },
        });
      }

      // 프로젝트 삭제
      await tx.project.delete({
        where: { id: projectUuid },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("MongoDB 데이터 삭제 중 오류:", error);
    return {
      success: false,
      error: `MongoDB 데이터 삭제 중 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * PostgreSQL에서 프로젝트 및 관련 데이터 삭제
 */
const deletePostgresData = async (projectUuid: string) => {
  try {
    // PostgreSQL에서 해당 프로젝트 찾기
    const project = await db.project.findUnique({
      where: { uuid: projectUuid },
      include: {
        project_users: true,
      },
    });

    if (!project) {
      return {
        success: false,
        error: "해당 UUID의 프로젝트를 PostgreSQL에서 찾을 수 없습니다.",
      };
    }

    // PostgreSQL 트랜잭션 시작
    await db.$transaction(async (tx) => {
      // 1. 프로젝트 사용자 연결 정보 삭제
      await tx.projectUser.deleteMany({
        where: { project_id: project.id },
      });

      // 2. 프로젝트 자체 삭제
      await tx.project.delete({
        where: { id: project.id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("프로젝트 데이터 삭제 중 오류:", error);
    return {
      success: false,
      error: `프로젝트 데이터 삭제 중 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
