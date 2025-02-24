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
