import { Session } from "next-auth";
import { getCanvasYdoc } from "./canvasYjs";
import { getDefaultStore } from "jotai";
import { projectSocketAtom } from "~/store/yjsAtoms";
import { Layer } from "@prisma/mongodb-client";
import {
  canvasLayersAtom,
  currentCanvasAtom,
  currentLayerAtom,
  currentLayersAtom,
  pageCanvasesAtom,
} from "~/store/atoms";
const store = getDefaultStore();

export const layerSocketHandler = () => {};

// 특정 캔버스의 레이어맵 가져오기
export const getLayersMap = (canvasId: string) => {
  const ydoc = getCanvasYdoc();
  return ydoc ? ydoc.getMap<Layer>(`layers-${canvasId}`) : null;
};

// 특정 캔버스의 모든 레이어 가져오기 (정렬된 상태로)
export const getLayers = (canvasId: string) => {
  const layersMap = getLayersMap(canvasId);
  if (!layersMap) return [];

  return Array.from(layersMap.values()).sort((a, b) => a.index - b.index);
};

export const observeLayerChanges = (canvasId: string) => {
  const ydoc = getCanvasYdoc();
  if (!ydoc) return;

  const layerMap = ydoc.getMap<Layer>(`layers-${canvasId}`);

  layerMap.observe((event) => {
    // 변경된 모든 레이어 가져오기
    const updatedLayers = Array.from(layerMap.values()).sort(
      (a, b) => a.index - b.index,
    );
    console.log("레이어 변경");

    // 현재 선택된 레이어 정보 가져오기
    const currentLayer = store.get(currentLayerAtom);

    // canvasLayersAtom 업데이트
    const canvasLayers = store.get(canvasLayersAtom);

    // 해당 캔버스의 레이어 정보만 업데이트
    store.set(canvasLayersAtom, {
      ...canvasLayers,
      [canvasId]: updatedLayers,
    });

    // pageCanvasesAtom 업데이트
    const pageCanvases = store.get(pageCanvasesAtom);

    // pageCanvasesAtom의 모든 페이지에 대해 반복
    const updatedPageCanvases = { ...pageCanvases };

    // 각 페이지의 캔버스 리스트를 순회
    Object.keys(updatedPageCanvases).forEach((pageId) => {
      // 해당 페이지의 캔버스 목록 가져오기
      const canvases = updatedPageCanvases[pageId];

      // canvases가 undefined 또는 null인 경우 건너뛰기
      if (!canvases) return;

      // 캔버스 목록에서 현재 변경된 캔버스 찾기
      const canvasIndex = canvases.findIndex(
        (canvas) => canvas && canvas.id === canvasId,
      );

      // 해당 캔버스가 존재하면 레이어 업데이트
      if (canvasIndex !== -1 && canvases[canvasIndex]) {
        // 캔버스 객체의 복사본 생성
        const updatedCanvas = { ...canvases[canvasIndex] };

        // 해당 캔버스의 레이어 업데이트
        updatedCanvas.canvas_layers = updatedLayers;

        // 새 캔버스 배열 생성 (기존 배열 변경 없이)
        const newCanvases = [...canvases];
        newCanvases[canvasIndex] = updatedCanvas;

        // 페이지 캔버스 목록 업데이트
        updatedPageCanvases[pageId] = newCanvases;
      }
    });

    // 업데이트된 pageCanvasesAtom 저장
    store.set(pageCanvasesAtom, updatedPageCanvases);

    // 현재 선택된 캔버스가 변경된 캔버스와 같은 경우 currentLayersAtom도 업데이트
    const selectedCanvas = store.get(currentCanvasAtom);
    if (selectedCanvas && selectedCanvas.id === canvasId) {
      store.set(currentLayersAtom, updatedLayers);

      // 현재 선택된 레이어가 삭제되었는지 확인
      if (
        currentLayer &&
        !updatedLayers.some((layer) => layer.id === currentLayer.id)
      ) {
        // 선택된 레이어가 삭제되었다면, 첫 번째 레이어 또는 null로 설정
        store.set(
          currentLayerAtom,
          updatedLayers.length > 0 ? updatedLayers[0] : undefined,
        );
      }
    }
  });
};
export const renameLayer = (
  canvasId: string,
  layerId: string,
  newName: string,
  session: Session,
) => {
  const layersMap = getLayersMap(canvasId);
  if (!layersMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 레이어 객체 가져오기
  const layer = layersMap.get(layerId);
  if (!layer) return;

  // 이름이 이미 같으면 진행하지 않음
  if (layer.name === newName) return;

  //   소켓 가져오기
  const socket = store.get(projectSocketAtom);

  doc.transact(() => {
    // 변경된 레이어 객체 생성
    const updatedLayer = {
      ...layer,
      name: newName,
      updated_user_id: session.user.id,
      updated_at: new Date(),
    };

    // 캔버스 맵에 업데이트된 캔버스 저장
    layersMap.set(layerId, updatedLayer);
  });

  // 서버에 업데이트 전송
  if (socket) {
    socket.emit("renameLayer", {
      canvasId,
      layerId,
      newName,
      updatedBy: session.user.id,
    });
  }
};

// 레이어 추가
export const addLayer = (
  canvasId: string,
  session: Session,
): Promise<string | null> => {
  const layersMap = getLayersMap(canvasId);
  if (!layersMap) return Promise.resolve(null);

  const doc = getCanvasYdoc();
  if (!doc) return Promise.resolve(null);

  // 현재 레이어 상태 가져오기
  const layers = getLayers(canvasId) || [];

  // 서버에 레이어 생성 요청
  const socket = store.get(projectSocketAtom);
  if (!socket) return Promise.resolve(null);

  // Promise로 감싸서 socket 응답을 기다리게 함
  return new Promise((resolve) => {
    socket.emit(
      "createLayer",
      {
        canvasId: canvasId,
        project: socket.id,
        layerData: {
          name: `Layer ${layers.length + 1}`,
          created_user_id: session.user.id,
          updated_user_id: session.user.id,
        },
      },
      (response: any) => {
        if (!response.success) {
          console.error("레이어 생성 실패:", response.error);
          resolve(null);
          return;
        }

        const newLayer = response.layer;

        doc.transact(() => {
          // 레이어 맵에 새 레이어 추가
          layersMap.set(newLayer.id, newLayer);
        });

        // 캔버스 레이어 상태 업데이트
        const updatedLayers = Array.from(layersMap.values()).sort(
          (a, b) => a.index - b.index,
        );

        // 캔버스별 레이어 상태 업데이트
        const canvasLayers = store.get(canvasLayersAtom);
        store.set(canvasLayersAtom, {
          ...canvasLayers,
          [canvasId]: updatedLayers,
        });

        // 현재 선택된 캔버스와 새 레이어를 추가한 캔버스가 같은 경우
        const selectedCanvas = store.get(currentCanvasAtom);
        if (selectedCanvas && selectedCanvas.id === canvasId) {
          store.set(currentLayersAtom, updatedLayers);
          store.set(currentLayerAtom, newLayer); // 새 레이어를 선택 상태로 설정
        }

        // 실제 생성된 레이어 ID 반환
        resolve(newLayer.id);
      },
    );
  });
};

// 레이어 순서 변경 함수
export const reorderLayer = (
  canvasId: string,
  sourceIndex: number,
  destinationIndex: number,
) => {
  const layersMap = getLayersMap(canvasId);
  if (!layersMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 레이어 상태 가져오기
  const layers = getLayers(canvasId);
  if (!layers || layers.length === 0) return;

  // 정렬된 레이어 배열
  const sortedLayers = [...layers].sort((a, b) => a.index - b.index);

  // 이동할 레이어
  const movingLayer = sortedLayers[sourceIndex];
  if (!movingLayer) return;

  // 드래그 후 새 순서로 정렬된 레이어 ID 배열 생성
  const layerIds = sortedLayers.map((layer) => layer.id);
  const reorderedLayerIds = [...layerIds];
  const movedId = reorderedLayerIds.splice(sourceIndex, 1)[0];
  reorderedLayerIds.splice(destinationIndex, 0, movedId!);

  // 새로운 순서대로 정렬된 레이어 배열 생성
  const newOrderedLayers = reorderedLayerIds
    .map((id, index) => {
      const layer = sortedLayers.find((l) => l.id === id);
      if (layer) {
        return {
          ...layer,
          index,
        };
      }
      return null;
    })
    .filter(Boolean) as Layer[];

  // 트랜잭션으로 일괄 처리
  doc.transact(() => {
    // 각 레이어의 인덱스를 새 순서에 맞게 업데이트
    newOrderedLayers.forEach((layer) => {
      layersMap.set(layer.id, layer);
    });
  });

  // 서버에 레이어 재정렬 요청
  const socket = store.get(projectSocketAtom);
  if (socket) {
    socket.emit(
      "reorderLayers",
      {
        canvasId: canvasId,
        layerIds: reorderedLayerIds,
        project: socket.id,
      },
      (response: any) => {
        if (!response.success) {
          console.error("레이어 순서 변경 실패:", response.error);

          // 실패 시 원래 순서로 되돌리기
          doc.transact(() => {
            sortedLayers.forEach((layer) => {
              layersMap.set(layer.id, layer);
            });
          });
        }
      },
    );
  }
};
