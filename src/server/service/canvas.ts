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
