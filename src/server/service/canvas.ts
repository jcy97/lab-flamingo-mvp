import { PageWithCanvases } from "../../store/atoms";
import { mongo } from "../mongo";

/**
 * 주어진 프로젝트 ID에 해당하는 페이지와 각 페이지의 캔버스를 데이터베이스에서 조회합니다.
 *
 * @param {string} projectId - 조회할 프로젝트의 ID
 * @returns {Promise<any[]>} - 프로젝트에 포함된 페이지와 캔버스 목록, 오류 발생 시 undefined를 반환
 *
 * @throws {Error} - 데이터베이스 조회 중 문제가 발생할 경우 오류를 콘솔에 출력합니다.
 *
 * 이 함수는 다음과 같은 작업을 수행합니다:
 * 1. `mongo.page.findMany` 메서드를 호출하여 특정 프로젝트 ID에 해당하는 모든 페이지를 조회합니다.
 * 2. 페이지는 인덱스 기준으로 오름차순 정렬되며, 각 페이지의 캔버스도 인덱스 기준으로 오름차순 정렬하여 포함됩니다.
 */
export const selectPagesWithCanvases = async (projectId: string) => {
  try {
    const result = await mongo.page.findMany({
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
          include: {
            canvas_layers: {
              orderBy: {
                index: "asc",
              },
            },
          },
        },
      },
    });
    return result ?? [];
  } catch (error) {
    console.error(error);
  }
};

/**
 * 페이지 순서(인덱스)만 업데이트하는 함수
 * @param {string} projectId - 프로젝트 ID
 * @param {Array} pages - 순서가 변경된 페이지 배열 (기본 정보만 포함)
 */
export const updatePagesOrder = async (
  projectId: string,
  pages: { id: string; index: number }[],
) => {
  // 트랜잭션으로 모든 페이지 인덱스 업데이트
  await mongo.$transaction(async (tx) => {
    for (const page of pages) {
      await tx.page.update({
        where: { id: page.id },
        data: {
          index: page.index,
          updated_at: new Date(),
        },
      });
    }
  });

  return true;
};
/**
 * 프로젝트 내에 새로운 페이지, 캔버스, 레이어를 순차적으로 생성하는 함수
 * @param {string} projectId - 프로젝트 ID
 * @param {Object} pageData - 페이지 생성 데이터
 */
export const createNewPageWithDefaults = async (
  projectId: string,
  pageData: {
    id: string;
    name: string;
    created_user_id: string;
    updated_user_id: string;
  },
) => {
  try {
    console.log("페이지 저장");
    console.log(pageData);
    const result = await mongo.$transaction(async (tx) => {
      // 기존 페이지 수 계산하여 인덱스 설정
      const existingPagesCount = await tx.page.count({
        where: { project_id: projectId },
      });

      // 1. 새 페이지 생성
      const newPage = await tx.page.create({
        data: {
          name: pageData.name,
          index: existingPagesCount + 1, // 기존 페이지 개수를 인덱스로 사용 (맨 뒤에 추가)
          project_id: projectId,
          created_user_id: pageData.created_user_id,
          updated_user_id: pageData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 2. 기본 캔버스 생성
      const defaultCanvas = await tx.canvas.create({
        data: {
          name: "캔버스 1",
          index: 0,
          page_id: newPage.id,
          created_user_id: pageData.created_user_id,
          updated_user_id: pageData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const defaultLayer = await tx.layer.create({
        data: {
          name: "레이어 1",
          index: 0,
          canvas_id: defaultCanvas.id,
          created_user_id: pageData.created_user_id,
          updated_user_id: pageData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 4. 결과 객체 조립
      const completePage: PageWithCanvases = {
        ...newPage,
        page_canvases: [
          {
            ...defaultCanvas,
            canvas_layers: [defaultLayer],
          },
        ],
      };

      return completePage;
    });

    return {
      success: true,
      page: result,
    };
  } catch (error) {
    console.error("페이지 생성 중 오류 발생:", error);
    return {
      success: false,
      error: "페이지 생성에 실패했습니다.",
    };
  }
};

/**
 * 특정 페이지의 정보를 업데이트하는 함수
 *
 * @param {string} pageId - 업데이트할 페이지의 ID
 * @param {Object} updates - 업데이트할 데이터 (이름, 업데이트 시간, 업데이트한 사용자 ID 등)
 * @returns {Promise<Object>} - 업데이트된 페이지 정보와 성공 여부
 */
export const updatePage = async (
  pageId: string,
  updates: {
    name?: string;
    index?: number;
    updated_at?: Date;
    updated_user_id?: string;
  },
) => {
  try {
    // 페이지 정보 업데이트
    const updatedPage = await mongo.page.update({
      where: { id: pageId },
      data: {
        // 제공된 업데이트 필드만 적용
        ...(updates.name && { name: updates.name }),
        ...(updates.index !== undefined && { index: updates.index }),
        // 항상 서버 측에서 새 Date 객체 생성하여 사용
        updated_at: new Date(),
        ...(updates.updated_user_id && {
          updated_user_id: updates.updated_user_id,
        }),
      },
      include: {
        page_canvases: {
          orderBy: {
            index: "asc",
          },
          include: {
            canvas_layers: {
              orderBy: {
                index: "asc",
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      page: updatedPage,
    };
  } catch (error) {
    console.error("페이지 업데이트 실패:", error);
    return {
      success: false,
      error: "페이지 업데이트에 실패했습니다.",
    };
  }
};

/**
 * 특정 페이지와 관련된 모든 리소스를 삭제하는 함수
 *
 * @param {string} pageId - 삭제할 페이지의 ID
 * @returns {Promise<Object>} - 삭제 작업 결과와 성공 여부
 */
export const deletePage = async (pageId: string) => {
  try {
    // 삭제 전에 페이지 정보를 먼저 조회 (관련 캔버스, 레이어 ID를 얻기 위함)
    const pageToDelete = await mongo.page.findUnique({
      where: { id: pageId },
      include: {
        page_canvases: {
          include: {
            canvas_layers: true,
          },
        },
      },
    });

    if (!pageToDelete) {
      return {
        success: false,
        error: "삭제할 페이지를 찾을 수 없습니다.",
      };
    }

    // 트랜잭션으로 모든 관련 리소스를 원자적으로 삭제
    await mongo.$transaction(async (tx) => {
      // 1. 각 캔버스에 속한 레이어 삭제
      for (const canvas of pageToDelete.page_canvases) {
        await tx.layer.deleteMany({
          where: { canvas_id: canvas.id },
        });
      }

      // 2. 페이지에 속한 모든 캔버스 삭제
      await tx.canvas.deleteMany({
        where: { page_id: pageId },
      });

      // 3. 페이지 삭제
      await tx.page.delete({
        where: { id: pageId },
      });

      // 4. 동일 프로젝트 내 다른 페이지들의 인덱스 조정
      // 삭제된 페이지보다 인덱스가 큰 페이지들의 인덱스를 1씩 감소
      if (pageToDelete.index !== undefined) {
        await tx.page.updateMany({
          where: {
            project_id: pageToDelete.project_id,
            index: { gt: pageToDelete.index },
          },
          data: {
            index: { decrement: 1 },
            updated_at: new Date(),
          },
        });
      }
    });

    // 삭제 후 페이지의 프로젝트에 속한 모든 페이지 조회
    const remainingPages = await mongo.page.findMany({
      where: { project_id: pageToDelete.project_id },
      orderBy: { index: "asc" },
      include: {
        page_canvases: {
          orderBy: { index: "asc" },
          include: {
            canvas_layers: {
              orderBy: { index: "asc" },
            },
          },
        },
      },
    });

    return {
      success: true,
      deletedPageId: pageId,
      projectId: pageToDelete.project_id,
      remainingPages: remainingPages,
    };
  } catch (error) {
    console.error("페이지 삭제 실패:", error);
    return {
      success: false,
      error: "페이지 삭제에 실패했습니다.",
    };
  }
};

/**
 * 캔버스 정보를 업데이트하는 함수
 *
 * @param {string} canvasId - 업데이트할 캔버스의 ID
 * @param {Object} updates - 업데이트할 데이터 (이름, 업데이트 시간, 업데이트한 사용자 ID 등)
 * @returns {Promise<Object>} - 업데이트된 캔버스 정보와 성공 여부
 */
export const updateCanvas = async (
  canvasId: string,
  updates: {
    name?: string;
    index?: number;
    updated_user_id?: string;
  },
) => {
  try {
    // 캔버스 정보 업데이트
    const updatedCanvas = await mongo.canvas.update({
      where: { id: canvasId },
      data: {
        // 제공된 업데이트 필드만 적용
        ...(updates.name && { name: updates.name }),
        ...(updates.index !== undefined && { index: updates.index }),
        // 항상 서버 측에서 새 Date 객체 생성하여 사용
        updated_at: new Date(),
        ...(updates.updated_user_id && {
          updated_user_id: updates.updated_user_id,
        }),
      },
      include: {
        canvas_layers: {
          orderBy: {
            index: "asc",
          },
        },
      },
    });

    return {
      success: true,
      canvas: updatedCanvas,
    };
  } catch (error) {
    console.error("캔버스 업데이트 실패:", error);
    return {
      success: false,
      error: "캔버스 업데이트에 실패했습니다.",
    };
  }
};

/**
 * 프로젝트 내 특정 페이지에 새로운 캔버스와 기본 레이어를 생성하는 함수
 * @param {string} pageId - 캔버스를 생성할 페이지 ID
 * @param {Object} canvasData - 캔버스 생성 데이터
 */
export const createCanvas = async (
  pageId: string,
  canvasData: {
    name: string | number;
    width?: number;
    height?: number;
    created_user_id: string;
    updated_user_id: string;
  },
) => {
  try {
    const result = await mongo.$transaction(async (tx) => {
      // 기존 캔버스 수 계산하여 인덱스 설정
      const existingCanvasCount = await tx.canvas.count({
        where: { page_id: pageId },
      });

      // 1. 새 캔버스 생성 (width와 height에 기본값 적용)
      const newCanvas = await tx.canvas.create({
        data: {
          name: `캔버스 ${canvasData.name || existingCanvasCount + 1}`,
          index: existingCanvasCount, // 기존 캔버스 개수를 인덱스로 사용 (맨 뒤에 추가)
          width: canvasData.width || 1920, // 기본값: 1920 (FHD 가로)
          height: canvasData.height || 1080, // 기본값: 1080 (FHD 세로)
          page_id: pageId,
          created_user_id: canvasData.created_user_id,
          updated_user_id: canvasData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 2. 기본 레이어 생성
      const defaultLayer = await tx.layer.create({
        data: {
          name: "레이어 1",
          index: 0,
          canvas_id: newCanvas.id,
          created_user_id: canvasData.created_user_id,
          updated_user_id: canvasData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 3. 생성된 캔버스와 레이어 정보를 포함하여 반환
      return {
        ...newCanvas,
        canvas_layers: [defaultLayer],
      };
    });

    return {
      success: true,
      canvas: result,
    };
  } catch (error) {
    console.error("캔버스 생성 중 오류 발생:", error);
    return {
      success: false,
      error: "캔버스 생성에 실패했습니다.",
    };
  }
};
/**
 * 특정 페이지 내의 캔버스 순서를 재정렬하는 함수
 * @param {string} pageId - 페이지 ID
 * @param {string[]} canvasIds - 순서가 변경된 캔버스 ID 배열 (새로운 순서대로)
 * @returns {Promise<Object>} - 재정렬 작업 결과와 성공 여부
 */
export const reorderCanvases = async (pageId: string, canvasIds: string[]) => {
  try {
    // 트랜잭션으로 모든 캔버스 인덱스 업데이트
    await mongo.$transaction(async (tx) => {
      // 각 캔버스의 인덱스를 새 순서에 맞게 업데이트
      for (let index = 0; index < canvasIds.length; index++) {
        await tx.canvas.update({
          where: {
            id: canvasIds[index],
            page_id: pageId, // 페이지 ID 확인 (안전장치)
          },
          data: {
            index: index, // 새 인덱스 값 설정
            updated_at: new Date(), // 업데이트 시간 갱신
          },
        });
      }
    });

    // 업데이트된 캔버스 목록 조회
    const updatedCanvases = await mongo.canvas.findMany({
      where: { page_id: pageId },
      orderBy: { index: "asc" },
      include: {
        canvas_layers: {
          orderBy: { index: "asc" },
        },
      },
    });

    return {
      success: true,
      pageId,
      canvases: updatedCanvases,
    };
  } catch (error) {
    console.error("캔버스 순서 재정렬 실패:", error);
    return {
      success: false,
      error: "캔버스 순서 재정렬에 실패했습니다.",
    };
  }
};

/**
 * 특정 캔버스와 관련된 모든 레이어를 삭제하는 함수
 *
 * @param {string} canvasId - 삭제할 캔버스의 ID
 * @returns {Promise<Object>} - 삭제 작업 결과와 성공 여부
 */
export const deleteCanvas = async (canvasId: string) => {
  try {
    // 삭제 전에 캔버스 정보를 먼저 조회 (페이지 ID와 인덱스를 얻기 위함)
    const canvasToDelete = await mongo.canvas.findUnique({
      where: { id: canvasId },
      include: {
        canvas_layers: true,
      },
    });

    if (!canvasToDelete) {
      return {
        success: false,
        error: "삭제할 캔버스를 찾을 수 없습니다.",
      };
    }

    // 페이지 ID 저장
    const pageId = canvasToDelete.page_id;
    const canvasIndex = canvasToDelete.index;

    // 트랜잭션으로 모든 관련 리소스를 원자적으로 삭제
    await mongo.$transaction(async (tx) => {
      // 1. 캔버스에 속한 모든 레이어 삭제
      await tx.layer.deleteMany({
        where: { canvas_id: canvasId },
      });

      // 2. 캔버스 삭제
      await tx.canvas.delete({
        where: { id: canvasId },
      });

      // 3. 동일 페이지 내 다른 캔버스들의 인덱스 조정
      // 삭제된 캔버스보다 인덱스가 큰 캔버스들의 인덱스를 1씩 감소
      await tx.canvas.updateMany({
        where: {
          page_id: pageId,
          index: { gt: canvasIndex },
        },
        data: {
          index: { decrement: 1 },
          updated_at: new Date(),
        },
      });
    });

    // 삭제 후 페이지에 속한 모든 캔버스 조회
    const remainingCanvases = await mongo.canvas.findMany({
      where: { page_id: pageId },
      orderBy: { index: "asc" },
      include: {
        canvas_layers: {
          orderBy: { index: "asc" },
        },
      },
    });

    return {
      success: true,
      deletedCanvasId: canvasId,
      pageId: pageId,
      remainingCanvases: remainingCanvases,
    };
  } catch (error) {
    console.error("캔버스 삭제 실패:", error);
    return {
      success: false,
      error: "캔버스 삭제에 실패했습니다.",
    };
  }
};
