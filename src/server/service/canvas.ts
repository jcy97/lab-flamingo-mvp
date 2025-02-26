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
 * 프로젝트의 페이지들과 관련 캔버스, 레이어를 저장하는 함수
 * @param {string} projectId - 프로젝트 ID
 * @param {Array} pages - 저장할 페이지 배열
 */
export const savePagesWithCanvasesAndLayers = async (
  projectId: string,
  pages: PageWithCanvases[],
) => {
  // 프로젝트에 속한 현재 DB의 모든 페이지 조회
  const existingPages = await mongo.page.findMany({
    where: { project_id: projectId },
    include: {
      page_canvases: {
        include: {
          canvas_layers: true,
        },
      },
    },
  });

  // 기존 페이지 ID 맵
  const existingPageMap = new Map(existingPages.map((page) => [page.id, page]));

  // 현재 요청에 포함된 페이지 ID 집합
  const currentPageIds = new Set(pages.map((page) => page.id));

  // 트랜잭션으로 모든 작업 수행
  await mongo.$transaction(async (tx) => {
    // 1. 삭제된 페이지 처리 (요청에 없는 기존 페이지)
    for (const existingPage of existingPages) {
      if (!currentPageIds.has(existingPage.id)) {
        // 삭제된 페이지의 캔버스와 레이어 제거
        for (const canvas of existingPage.page_canvases) {
          await tx.layer.deleteMany({
            where: { canvas_id: canvas.id },
          });
        }

        await tx.canvas.deleteMany({
          where: { page_id: existingPage.id },
        });

        await tx.page.delete({
          where: { id: existingPage.id },
        });
      }
    }

    // 2. 페이지 생성/업데이트 처리
    for (const page of pages) {
      const existingPage = existingPageMap.get(page.id);

      if (!existingPage) {
        // 2-1. 신규 페이지 생성
        const newPage = await tx.page.create({
          data: {
            id: page.id,
            name: page.name,
            index: page.index,
            created_at: page.created_at,
            created_user_id: page.created_user_id,
            updated_at: page.updated_at || new Date(),
            updated_user_id: page.updated_user_id,
            project_id: projectId,
          },
        });

        // 새 페이지의 캔버스 생성
        if (page.page_canvases && page.page_canvases.length > 0) {
          for (const canvas of page.page_canvases) {
            const newCanvas = await tx.canvas.create({
              data: {
                id: canvas.id,
                name: canvas.name,
                index: canvas.index,
                created_at: canvas.created_at,
                created_user_id: canvas.created_user_id,
                updated_at: canvas.updated_at || new Date(),
                updated_user_id: canvas.updated_user_id,
                page_id: newPage.id,
              },
            });

            // 새 캔버스의 레이어 생성
            if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
              for (const layer of canvas.canvas_layers) {
                await tx.layer.create({
                  data: {
                    name: layer.name,
                    index: layer.index,
                    created_at: layer.created_at,
                    created_user_id: layer.created_user_id,
                    updated_at: layer.updated_at || new Date(),
                    updated_user_id: layer.updated_user_id,
                    canvas_id: newCanvas.id,
                  },
                });
              }
            }
          }
        }
      } else {
        // 2-2. 기존 페이지 업데이트
        await tx.page.update({
          where: { id: page.id },
          data: {
            name: page.name,
            index: page.index,
            updated_at: page.updated_at || new Date(),
            updated_user_id: page.updated_user_id,
          },
        });

        // 기존 캔버스 ID 맵
        const existingCanvasMap = new Map(
          existingPage.page_canvases.map((canvas) => [canvas.id, canvas]),
        );

        // 현재 요청에 포함된 캔버스 ID 집합
        const currentCanvasIds = new Set(
          (page.page_canvases || []).map((canvas) => canvas.id),
        );

        // 2-2-1. 삭제된 캔버스 처리
        for (const existingCanvas of existingPage.page_canvases) {
          if (!currentCanvasIds.has(existingCanvas.id)) {
            // 캔버스 레이어 삭제
            await tx.layer.deleteMany({
              where: { canvas_id: existingCanvas.id },
            });

            // 캔버스 삭제
            await tx.canvas.delete({
              where: { id: existingCanvas.id },
            });
          }
        }

        // 2-2-2. 캔버스 생성/업데이트
        if (page.page_canvases && page.page_canvases.length > 0) {
          for (const canvas of page.page_canvases) {
            const existingCanvas = existingCanvasMap.get(canvas.id);

            if (!existingCanvas) {
              // 신규 캔버스 생성
              const newCanvas = await tx.canvas.create({
                data: {
                  id: canvas.id,
                  name: canvas.name,
                  index: canvas.index,
                  created_at: canvas.created_at,
                  created_user_id: canvas.created_user_id,
                  updated_at: canvas.updated_at || new Date(),
                  updated_user_id: canvas.updated_user_id,
                  page_id: page.id,
                },
              });

              // 레이어 생성
              if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
                for (const layer of canvas.canvas_layers) {
                  await tx.layer.create({
                    data: {
                      name: layer.name,
                      index: layer.index,
                      created_at: layer.created_at,
                      created_user_id: layer.created_user_id,
                      updated_at: layer.updated_at || new Date(),
                      updated_user_id: layer.updated_user_id,
                      canvas_id: newCanvas.id,
                    },
                  });
                }
              }
            } else {
              // 캔버스 업데이트
              await tx.canvas.update({
                where: { id: canvas.id },
                data: {
                  name: canvas.name,
                  index: canvas.index,
                  updated_at: canvas.updated_at || new Date(),
                  updated_user_id: canvas.updated_user_id,
                },
              });

              // 기존 레이어 ID 맵
              const existingLayerMap = new Map(
                existingCanvas.canvas_layers.map((layer) => [layer.id, layer]),
              );

              // 현재 요청에 포함된 레이어 ID 집합
              const currentLayerIds = new Set(
                (canvas.canvas_layers || []).map((layer) => layer.id),
              );

              // 삭제된 레이어 처리
              for (const existingLayer of existingCanvas.canvas_layers) {
                if (!currentLayerIds.has(existingLayer.id)) {
                  // 레이어 삭제
                  await tx.layer.delete({
                    where: { id: existingLayer.id },
                  });
                }
              }

              // 레이어 생성/업데이트
              if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
                for (const layer of canvas.canvas_layers) {
                  const existingLayer = existingLayerMap.get(layer.id);

                  if (!existingLayer) {
                    // 신규 레이어 생성
                    await tx.layer.create({
                      data: {
                        name: layer.name,
                        index: layer.index,
                        created_at: layer.created_at,
                        created_user_id: layer.created_user_id,
                        updated_at: layer.updated_at || new Date(),
                        updated_user_id: layer.updated_user_id,
                        canvas_id: canvas.id,
                      },
                    });
                  } else {
                    // 레이어 업데이트
                    await tx.layer.update({
                      where: { id: layer.id },
                      data: {
                        name: layer.name,
                        index: layer.index,
                        updated_at: layer.updated_at || new Date(),
                        updated_user_id: layer.updated_user_id,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  });
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
          index: existingPagesCount, // 기존 페이지 개수를 인덱스로 사용 (맨 뒤에 추가)
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
