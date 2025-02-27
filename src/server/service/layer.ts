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
    // 해당 캔버스의 모든 레이어 조회하여 최대 인덱스 값 찾기
    const existingLayers = await mongo.layer.findMany({
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

    // 레이어 생성
    const newLayer = await mongo.layer.create({
      data: {
        name: layerData.name,
        index: newIndex,
        created_user_id: layerData.created_user_id,
        updated_user_id: layerData.updated_user_id,
        created_at: new Date(),
        updated_at: new Date(),
        canvas: {
          connect: {
            id: canvasId,
          },
        },
      },
    });

    return {
      success: true,
      layer: newLayer,
    };
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
