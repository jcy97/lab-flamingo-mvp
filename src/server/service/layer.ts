import { mongo } from "../mongo";

/**
 * 새 레이어를 생성하는 함수
 *
 * @param {string} canvasId - 레이어를 추가할 캔버스의 ID
 * @param {Object} layerData - 생성할 레이어 데이터 (이름, 생성 사용자 ID 등)
 * @returns {Promise<Object>} - 생성된 레이어 정보와 성공 여부
 */
export const createLayer = async (
  canvasId: string,
  layerData: {
    name: string;
    created_user_id: string;
    updated_user_id: string;
  },
) => {
  try {
    return await mongo.$transaction(async (tx) => {
      // 해당 캔버스의 모든 레이어 조회하여 최대 인덱스 값 찾기
      const existingLayers = await tx.layer.findMany({
        where: {
          canvas_id: canvasId,
        },
      });

      // 최대 인덱스 값 찾기
      let maxIndex = -1;
      if (existingLayers.length > 0) {
        maxIndex = Math.max(...existingLayers.map((layer) => layer.index));
      }

      // 새 레이어의 인덱스 설정 (기존 레이어가 없으면 0, 있으면 최대 인덱스 + 1)
      const newIndex = maxIndex + 1;

      // 1. 레이어 생성 (항상 NORMAL 타입으로 생성)
      const newLayer = await tx.layer.create({
        data: {
          name: layerData.name,
          index: newIndex,
          type: "NORMAL", // 항상 NORMAL 타입으로 고정
          created_user_id: layerData.created_user_id,
          updated_user_id: layerData.updated_user_id,
          created_at: new Date(),
          updated_at: new Date(),
          canvas_id: canvasId,
        },
      });

      // 2. 레이어 컨텐츠 생성 (항상 normal_data 포함)
      const layerContent = await tx.layerContent.create({
        data: {
          layer_id: newLayer.id,
          position_x: 0,
          position_y: 0,
          rotation: 0,
          normal_data: {}, // NORMAL 타입을 위한 빈 객체로 초기화
        },
      });

      // 생성된 레이어와 레이어 컨텐츠 정보 반환
      return {
        success: true,
        layer: {
          ...newLayer,
          layer_content: layerContent,
        },
      };
    });
  } catch (error) {
    console.error("레이어 생성 실패:", error);
    return {
      success: false,
      error: "레이어 생성에 실패했습니다.",
    };
  }
};

/**
 * 특정 레이어의 정보를 업데이트하는 함수
 *
 * @param {string} layerId - 업데이트할 레이어의 ID
 * @param {Object} updates - 업데이트할 데이터 (이름, 업데이트 시간, 업데이트한 사용자 ID 등)
 * @returns {Promise<Object>} - 업데이트된 레이어 정보와 성공 여부
 */
export const updateLayer = async (
  layerId: string,
  updates: {
    name?: string;
    index?: number;
    updated_user_id?: string;
  },
) => {
  try {
    // 레이어 정보 업데이트
    const updatedLayer = await mongo.layer.update({
      where: { id: layerId },
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
    });

    return {
      success: true,
      layer: updatedLayer,
    };
  } catch (error) {
    console.error("레이어 업데이트 실패:", error);
    return {
      success: false,
      error: "레이어 업데이트에 실패했습니다.",
    };
  }
};

/**
 * 레이어 순서를 변경하는 함수
 *
 * @param {string} canvasId - 레이어가 속한 캔버스 ID
 * @param {string[]} layerIds - 새로운 순서로 정렬된 레이어 ID 배열
 * @returns {Promise<Object>} - 업데이트된 레이어 목록과 성공 여부
 */
export const reorderLayers = async (canvasId: string, layerIds: string[]) => {
  try {
    // 트랜잭션으로 모든 레이어 업데이트 작업을 일괄 처리
    const updatePromises = layerIds.map((layerId, index) => {
      return mongo.layer.update({
        where: {
          id: layerId,
          canvas_id: canvasId, // 추가 보안을 위해 캔버스 ID도 확인
        },
        data: {
          index: index,
          updated_at: new Date(),
        },
      });
    });

    // 모든 업데이트 프로미스 실행
    await Promise.all(updatePromises);

    // 업데이트된 레이어 목록 조회 (순서대로 정렬)
    const updatedLayers = await mongo.layer.findMany({
      where: {
        canvas_id: canvasId,
      },
      orderBy: {
        index: "asc",
      },
    });

    return {
      success: true,
      layers: updatedLayers,
    };
  } catch (error) {
    console.error("레이어 순서 변경 실패:", error);
    return {
      success: false,
      error: "레이어 순서 변경에 실패했습니다.",
    };
  }
};

/**
 * 레이어를 삭제하는 함수
 *
 * @param {string} layerId - 삭제할 레이어의 ID
 * @param {string} canvasId - 레이어가 속한 캔버스 ID (추가 보안 확인용)
 * @returns {Promise<Object>} - 삭제 결과와 성공 여부, 캔버스에 남아있는 레이어 목록
 */
export const deleteLayer = async (layerId: string, canvasId: string) => {
  try {
    // 해당 레이어가 존재하는지, 그리고 지정된 캔버스에 속하는지 확인
    const layer = await mongo.layer.findFirst({
      where: {
        id: layerId,
        canvas_id: canvasId,
      },
    });

    if (!layer) {
      return {
        success: false,
        error: "레이어를 찾을 수 없습니다.",
      };
    }

    // 해당 캔버스의 모든 레이어 개수 확인
    const layersCount = await mongo.layer.count({
      where: {
        canvas_id: canvasId,
      },
    });

    // 최소 한 개의 레이어는 유지되어야 함
    if (layersCount <= 1) {
      return {
        success: false,
        error: "최소한 하나의 레이어는 유지되어야 합니다.",
      };
    }

    // 레이어 삭제
    await mongo.layer.delete({
      where: {
        id: layerId,
      },
    });

    // 남은 레이어들의 인덱스 재정렬
    const remainingLayers = await mongo.layer.findMany({
      where: {
        canvas_id: canvasId,
      },
      orderBy: {
        index: "asc",
      },
    });

    // 인덱스 재정렬 작업
    const updatePromises = remainingLayers.map((layer, index) => {
      return mongo.layer.update({
        where: {
          id: layer.id,
        },
        data: {
          index: index,
          updated_at: new Date(),
        },
      });
    });

    // 모든 업데이트 프로미스 실행
    await Promise.all(updatePromises);

    // 업데이트된 최종 레이어 목록 조회
    const updatedLayers = await mongo.layer.findMany({
      where: {
        canvas_id: canvasId,
      },
      orderBy: {
        index: "asc",
      },
    });

    return {
      success: true,
      remainingLayers: updatedLayers,
    };
  } catch (error) {
    console.error("레이어 삭제 실패:", error);
    return {
      success: false,
      error: "레이어 삭제에 실패했습니다.",
    };
  }
};
