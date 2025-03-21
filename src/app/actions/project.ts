"use server";

import { auth } from "~/server/auth";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";
import { projectSchema, Project } from "~/schemas";
import { ZodError } from "zod";
import {
  addProjectMemberPermission,
  checkProjectPermission,
  createProjectTransaction,
  createProjectWithDefaults,
  deleteProject,
  selectInitialProjectUrl,
  selectProjectUuidByUrl,
  selectUserProjects,
  updateProjectName,
} from "~/server/service/project";

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
      url: nanoid(),
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
    const result = await createProjectTransaction(
      validatedProject,
      session.user.id,
    );

    if (!result) return;
    /*
      협업 상세 정보 저장(몽고 DB)
    */
    await createProjectWithDefaults(session.user.id, result.uuid);

    // 결과 반환
    const newProject: Project = {
      uuid: result.uuid,
      name: result.name,
      url: result.url,
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
 * 프로젝트 이름을 업데이트하는 서버 액션
 * 유효성 검사 및 데이터베이스 업데이트를 모두 수행
 *
 * @param {string} uuid - 프로젝트 UUID
 * @param {string} newName - 변경할 새 프로젝트 이름
 * @returns {Promise<{ success: boolean; message?: string; }>} 업데이트 결과
 */
export const editProjectName = async (uuid: string, newName: string) => {
  const session = await auth();

  try {
    if (!session?.user.id) {
      return { success: false, message: "사용자가 존재하지 않습니다." };
    }

    // 이름 유효성 검사
    try {
      // 전체 스키마가 아닌 name 필드만 검증
      await projectSchema.pick({ name: true }).parseAsync({ name: newName });
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        return {
          success: false,
          message:
            validationError.errors[0]?.message ||
            "유효하지 않은 프로젝트 이름입니다.",
        };
      }
      throw validationError; // 다른 유형의 에러는 다시 던짐
    }

    // 데이터베이스 업데이트
    await updateProjectName(uuid, newName, session?.user.id);

    // 성공 시 반환값 추가
    return {
      success: true,
      message: "프로젝트 이름이 성공적으로 변경되었습니다.",
    };
  } catch (error) {
    console.error("프로젝트 이름 업데이트 중 오류 발생:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    return { success: false, message: errorMessage };
  }
};

/**
 * 프로젝트를 삭제하는 서버 액션
 * 해당 프로젝트와 관련된 모든 요소를 삭제합니다.
 *
 * @param {string} uuid - 프로젝트 UUID
 * @returns {Promise<{ success: boolean; message?: string; }>}  결과
 */
export const deleteProjectWithAllData = async (projectUuid: string) => {
  try {
    const result = await deleteProject(projectUuid);
    return result;
  } catch (error) {
    console.error("프로젝트 삭제 처리 중 오류:", error);
    return {
      success: false,
      message: "프로젝트 삭제 중 오류가 발생했습니다.",
    };
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
    const projectUsers = await selectUserProjects(session.user.id);
    if (!projectUsers) return [];
    // 프로젝트 정보 매핑
    return projectUsers.length > 0
      ? projectUsers.map((projectUser) => ({
          uuid: projectUser.project.uuid,
          name: projectUser.project.name,
          url: projectUser.project.url,
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
  const data = await selectInitialProjectUrl(projectId);
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
 * URL을 이용하여 프로젝트의 UUID를 찾는 함수
 * @param {string} url - 프로젝트의 URL
 * @returns {Promise<string | null>} 프로젝트의 UUID 또는 null (찾지 못한 경우)
 */
export const getProjectUuidByUrl = async (
  url: string,
): Promise<string | null> => {
  if (!url) return null;

  try {
    // URL을 사용하여 프로젝트 조회
    const project = await selectProjectUuidByUrl(url);

    return project;
  } catch (error) {
    console.error("URL로 프로젝트 조회 중 오류:", error);
    return null;
  }
};

/**
 * 사용자가 프로젝트에 대한 권한이 있는지 확인하고,
 * 권한이 없을 경우 MEMBER 권한을 추가하는 액션 함수
 *
 * @param projectUuid - 프로젝트 UUID
 * @returns 권한 확인 결과 객체
 */
export const checkAndAddProjectPermission = async (projectUuid: string) => {
  const session = await auth();

  try {
    // 로그인 확인
    if (!session?.user.id) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
        redirect: "/login",
      };
    }

    const userId = session.user.id;

    // 프로젝트 권한 확인 (서비스 레이어 호출)
    const permissionData = await checkProjectPermission(projectUuid, userId);

    if (!permissionData) {
      return {
        success: false,
        message: "프로젝트를 찾을 수 없습니다.",
        redirect: "/dashboard",
      };
    }

    const { project, permission } = permissionData;

    // 이미 권한이 있는 경우
    if (permission) {
      return {
        success: true,
        message: `'${project.name}' 프로젝트에 접근합니다.`,
        role: permission.role.name,
        isOwner: permission.role.name === "OWNER",
      };
    }

    // 권한이 없는 경우 MEMBER 권한 추가 (서비스 레이어 호출)
    const addPermissionResult = await addProjectMemberPermission(
      project.id,
      userId,
    );

    if (!addPermissionResult.success) {
      return {
        success: false,
        message:
          addPermissionResult.message || "권한 추가 중 오류가 발생했습니다.",
      };
    }

    return {
      success: true,
      message: `'${project.name}' 프로젝트에 MEMBER로 추가되었습니다.`,
      role: addPermissionResult.roleName,
      isOwner: false,
      isNewMember: true,
    };
  } catch (error) {
    console.error("프로젝트 권한 검사 중 오류:", error);
    return {
      success: false,
      message: "권한 확인 중 오류가 발생했습니다.",
    };
  }
};
