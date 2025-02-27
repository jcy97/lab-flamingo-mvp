import { mongo } from "../mongo";

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
