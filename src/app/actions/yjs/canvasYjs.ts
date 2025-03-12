import { Session } from "next-auth";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { SOCKET_URL } from "~/constants/socket";
import { getDefaultStore } from "jotai";
import { canvasYdocAtom, projectSocketAtom } from "~/store/yjsAtoms";
import {
  canvasLayersAtom,
  CanvasWithLayers,
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayerAtom,
  currentLayersAtom,
  currentPageAtom,
  LayerWithContents,
  pageCanvasesAtom,
} from "~/store/atoms";
import { layerSocketHandler, observeLayerChanges } from "./layerYjs";

const store = getDefaultStore();

// YDoc 가져오기 함수
export const getCanvasYdoc = () => store.get(canvasYdocAtom);

// 캔버스 맵 가져오기 함수
export const getCanvasesMap = () => {
  const ydoc = getCanvasYdoc();
  return ydoc ? ydoc.getMap<CanvasWithLayers>("canvasesMap") : null;
};

export const initCanvasYjs = (project: string, session: Session) => {
  // 기존 소켓 확인
  let socket = store.get(projectSocketAtom);

  // YDoc 초기화
  const ydoc = new Y.Doc();
  store.set(canvasYdocAtom, ydoc);

  // 웹소켓 연결
  const wsProvider = new SocketIOProvider(
    SOCKET_URL,
    `canvas-${project}`,
    ydoc,
    socket!,
  );

  wsProvider.on("status", ({ status }: { status: string }) => {
    console.log(status); // Logs "connected" or "disconnected"
  });

  // 캔버스 변경 감지 설정
  observeCanvasChanges();
  layerSocketHandler();

  // 서버에서 재정렬된 캔버스 정보를 받아서 처리하는 이벤트 핸들러 추가
  socket?.on("canvasesReordered", ({ pageId, canvases, success }) => {
    if (success && canvases && canvases.length > 0) {
      // YJS 문서의 캔버스 맵 가져오기
      const canvasesMap = getCanvasesMap();
      const doc = getCanvasYdoc();

      if (canvasesMap && doc) {
        // 현재 페이지 정보 확인
        const currentPage = store.get(currentPageAtom);

        if (currentPage && currentPage.id === pageId) {
          // 트랜잭션으로 일괄 처리
          doc.transact(() => {
            // 서버에서 받은 캔버스 정보로 캔버스 맵 업데이트
            canvases.forEach((canvas: any) => {
              canvasesMap.set(canvas.id, canvas);
            });
          });

          // 현재 페이지의 캔버스 목록을 업데이트
          store.set(currentCanvasesAtom, canvases);

          // pageCanvasesAtom도 업데이트
          const pageCanvases = store.get(pageCanvasesAtom);
          store.set(pageCanvasesAtom, {
            ...pageCanvases,
            [pageId]: canvases,
          });
        }
      }
    }
  });

  // 서버에서 삭제된 캔버스 정보를 받아서 처리하는 이벤트 핸들러 추가
  socket?.on(
    "canvasDeleted",
    ({ canvasId, pageId, remainingCanvases, success }) => {
      if (success && remainingCanvases) {
        // YJS 문서의 캔버스 맵 가져오기
        const canvasesMap = getCanvasesMap();
        const doc = getCanvasYdoc();

        if (canvasesMap && doc) {
          // 현재 페이지 정보 확인
          const currentPage = store.get(currentPageAtom);

          if (currentPage && currentPage.id === pageId) {
            // 트랜잭션으로 일괄 처리
            doc.transact(() => {
              // 캔버스 맵에서 삭제된 캔버스 제거
              canvasesMap.delete(canvasId);

              // 서버에서 받은 남은 캔버스 정보로 캔버스 맵 업데이트
              remainingCanvases.forEach((canvas: any) => {
                canvasesMap.set(canvas.id, canvas);
              });
            });
          }
        }
      }
    },
  );

  return { ydoc, socket };
};

// 캔버스 맵 초기화 함수
export const initCanvasesMap = (canvases: CanvasWithLayers[]) => {
  const ydoc = getCanvasYdoc();
  if (!ydoc) return;

  const canvasesMap = ydoc.getMap<CanvasWithLayers>("canvasesMap");

  // 단일 트랜잭션으로 모든 데이터 설정
  ydoc.transact(() => {
    // 기존 맵 데이터 초기화
    canvasesMap.clear();

    // 새 캔버스 데이터 설정 (레이어 관찰 설정 없이)
    canvases.forEach((canvas) => {
      canvasesMap.set(canvas.id, canvas);

      // 각 캔버스별 레이어맵 초기화
      if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
        const layersMap = ydoc.getMap<any>(`layers-${canvas.id}`);
        layersMap.clear();

        canvas.canvas_layers.forEach((layer) => {
          layersMap.set(layer.id, layer);
        });
      }
    });
  });

  // 데이터 설정이 완료된 후 레이어 관찰 설정 (지연 실행)
  setTimeout(() => {
    canvases.forEach((canvas) => {
      if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
        observeLayerChanges(canvas.id);
      }
    });
  }, 100);
};

// 캔버스 변경 감지 설정 함수
export const observeCanvasChanges = () => {
  const ydoc = getCanvasYdoc();
  if (!ydoc) return;

  const canvasesMap = ydoc.getMap<CanvasWithLayers>("canvasesMap");

  canvasesMap.observe((event) => {
    // 변경된 모든 캔버스 가져오기
    const updatedCanvases = Array.from(canvasesMap.values()).sort(
      (a, b) => a.index - b.index,
    );
    // 새로 추가된 캔버스에 대한 레이어 맵 초기화 및 레이어 변경 감지 설정
    event.keysChanged.forEach((canvasId) => {
      // keys는 String 타입이므로 적절히 형변환
      const canvasIdStr = canvasId.toString();
      const canvas = canvasesMap.get(canvasIdStr);
      // 새로 추가된 캔버스인 경우 (이전에 없었던 경우)
      event.keysChanged.forEach((canvasId) => {
        // keys는 String 타입이므로 적절히 형변환
        const canvasIdStr = canvasId.toString();
        const canvas = canvasesMap.get(canvasIdStr);

        // 새로 추가된 캔버스가 있을 경우
        if (canvas) {
          // 기존 레이어 관찰자가 없는지 확인을 위한 플래그 변수 (코드 내에서 관리)

          // YDoc에 관찰자 상태를 저장할 수 있는 맵이 없으므로
          // 여기서는 매번 레이어 맵 관찰을 설정하는 방식으로 수정
          // 이미 관찰 중이어도 observeLayerChanges가 중복 호출되어도 문제가 없도록 수정 필요

          // 레이어 맵 초기화 (이미 존재하는 경우 덮어쓰지 않음)
          const layersMap = ydoc.getMap<any>(`layers-${canvasIdStr}`);

          // 캔버스에 레이어가 있고 레이어 맵이 비어있으면 초기화
          if (
            canvas.canvas_layers &&
            canvas.canvas_layers.length > 0 &&
            layersMap.size === 0
          ) {
            // 트랜잭션으로 묶어 한 번에 처리
            ydoc.transact(() => {
              canvas.canvas_layers.forEach((layer) => {
                layersMap.set(layer.id, layer);
              });
            });
          }

          // 레이어 변경 감지 설정 (항상 호출)
          observeLayerChanges(canvasIdStr);
        }
      });
    });

    // canvasLayersAtom 업데이트 - 기존 레이어 정보 유지하면서 변경
    const canvasLayers = store.get(canvasLayersAtom);
    const updatedCanvasLayers = { ...canvasLayers };
    // 추가되거나 변경된 캔버스에 대해 레이어가 없는 경우에만 업데이트
    updatedCanvases.forEach((canvas) => {
      // 기존에 레이어 정보가 없는 캔버스의 경우에만 canvas_layers 정보 사용
      if (!updatedCanvasLayers[canvas.id]) {
        // 새 캔버스가 추가된 경우
        if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
          updatedCanvasLayers[canvas.id] = canvas.canvas_layers;
        } else {
          updatedCanvasLayers[canvas.id] = [];
        }
      }
      // 이미 레이어 정보가 있는 경우는 그대로 유지 (레이어 옵저버에서 관리)
    });

    // 삭제된 캔버스의 레이어 정보 제거
    Object.keys(updatedCanvasLayers).forEach((canvasId) => {
      if (!updatedCanvases.some((canvas) => canvas.id === canvasId)) {
        delete updatedCanvasLayers[canvasId];
      }
    });

    // 변경된 내용이 있는 경우에만 상태 업데이트
    if (JSON.stringify(canvasLayers) !== JSON.stringify(updatedCanvasLayers)) {
      store.set(canvasLayersAtom, updatedCanvasLayers);
    }

    // 현재 선택된 페이지 정보 가져오기
    const currentPage = store.get(currentPageAtom);

    if (currentPage) {
      const currentPageId = currentPage.id;
      // 현재 페이지의 캔버스만 필터링
      const currentPageCanvases = updatedCanvases.filter(
        (canvas) => canvas.page_id === currentPageId,
      );

      if (currentPageCanvases.length > 0) {
        // 현재 페이지의 캔버스 리스트 업데이트
        store.set(currentCanvasesAtom, currentPageCanvases);

        // pageCanvasesAtom 업데이트 (현재 페이지의 캔버스만 업데이트)
        const pageCanvases = store.get(pageCanvasesAtom);

        // 페이지 ID에 해당하는 캔버스 목록 업데이트
        store.set(pageCanvasesAtom, {
          ...pageCanvases,
          [currentPageId]: currentPageCanvases,
        });
      }
    }

    // 현재 선택된 캔버스 업데이트 (ID가 같은 경우만)
    const currentCanvas = store.get(currentCanvasAtom);
    if (currentCanvas) {
      const updatedCurrentCanvas = updatedCanvases.find(
        (c) => c.id === currentCanvas.id,
      );

      // 선택된 캔버스가 업데이트된 경우만 업데이트
      if (updatedCurrentCanvas) {
        // 중요: canvas_layers 정보는 현재 레이어 상태를 유지
        const updatedCanvas = {
          ...updatedCurrentCanvas,
          // 기존 canvas_layers 유지 (YJS의 레이어 정보는 그대로 복원)
          canvas_layers: currentCanvas.canvas_layers,
        };

        store.set(currentCanvasAtom, updatedCanvas);
      }
    } else {
      // 선택된 캔버스가 없는 경우 (최초 로드 또는 새 캔버스 추가 시)
      const currentPage = store.get(currentPageAtom);
      if (currentPage) {
        // 현재 페이지의 캔버스 중 첫 번째 캔버스를 선택
        const firstCanvasInPage = updatedCanvases.find(
          (canvas) => canvas.page_id === currentPage.id,
        );

        if (firstCanvasInPage) {
          store.set(currentCanvasAtom, firstCanvasInPage);

          // 레이어도 업데이트
          if (
            firstCanvasInPage.canvas_layers &&
            firstCanvasInPage.canvas_layers.length > 0
          ) {
            store.set(currentLayersAtom, firstCanvasInPage.canvas_layers);
            store.set(currentLayerAtom, firstCanvasInPage.canvas_layers[0]);
          }
        }
      }
    }
  });
};
// 캔버스 순서 변경 함수
export const reorderCanvases = (
  pageId: string,
  sourceIndex: number,
  destinationIndex: number,
) => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 캔버스 상태 가져오기
  const canvases = store.get(currentCanvasesAtom);
  if (!canvases) return;

  // 정렬된 캔버스 배열
  const sortedCanvases = [...canvases].sort((a, b) => a.index - b.index);

  // 이동할 캔버스
  const movingCanvas = sortedCanvases[sourceIndex];
  if (!movingCanvas) return;

  // 드래그 후 새 순서로 정렬된 캔버스 ID 배열 생성
  const canvasIds = sortedCanvases.map((canvas) => canvas.id);
  const reorderedCanvasIds = [...canvasIds];
  const movedId = reorderedCanvasIds.splice(sourceIndex, 1)[0];
  reorderedCanvasIds.splice(destinationIndex, 0, movedId!);

  // 새로운 순서대로 정렬된 캔버스 배열 생성
  const newOrderedCanvases = reorderedCanvasIds
    .map((id, index) => {
      const canvas = sortedCanvases.find((c) => c.id === id);
      if (canvas) {
        return {
          ...canvas,
          index,
        };
      }
      return null;
    })
    .filter(Boolean) as CanvasWithLayers[];

  // 트랜잭션으로 일괄 처리
  doc.transact(() => {
    // 각 캔버스의 인덱스를 새 순서에 맞게 업데이트
    newOrderedCanvases.forEach((canvas) => {
      canvasesMap.set(canvas.id, canvas);
    });
  });

  // 서버에 캔버스 재정렬 요청
  const socket = store.get(projectSocketAtom);
  if (socket) {
    socket.emit(
      "reorderCanvases",
      {
        pageId: pageId,
        canvasIds: reorderedCanvasIds,
        project: socket.id,
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 순서 변경 실패:", response.error);

          // 실패 시 원래 순서로 되돌리기
          doc.transact(() => {
            sortedCanvases.forEach((canvas) => {
              canvasesMap.set(canvas.id, canvas);
            });
          });
        }
      },
    );
  }
};

export const renameCanvas = (
  pageId: string,
  canvasId: string,
  newName: string,
  session: Session,
) => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 캔버스 객체 가져오기
  const canvas = canvasesMap.get(canvasId);
  if (!canvas) return;

  // 이름이 이미 같으면 진행하지 않음
  if (canvas.name === newName) return;

  // 트랜잭션 전에 소켓 저장
  const socket = store.get(projectSocketAtom);

  doc.transact(() => {
    // 변경된 캔버스 객체 생성
    const updatedCanvas = {
      ...canvas,
      name: newName,
      updated_user_id: session.user.id,
      updated_at: new Date(),
    };

    // 캔버스 맵에 업데이트된 캔버스 저장
    canvasesMap.set(canvasId, updatedCanvas);
  });

  // 서버에 업데이트 전송 (이제 updateCanvas 이벤트 사용)
  if (socket) {
    socket.emit(
      "updateCanvas",
      {
        canvasId: canvasId,
        pageId: pageId,
        project: socket.id,
        updates: {
          name: newName,
          updated_user_id: session.user.id,
        },
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 이름 변경 실패:", response.error);
          // 서버 업데이트가 실패하면 변경 사항 되돌리기
          if (canvas) {
            doc.transact(() => {
              canvasesMap.set(canvasId, canvas);
            });
          }
        }
      },
    );
  }
};
// 캔버스 삭제 함수
export const deleteCanvas = (pageId: string, canvasId: string) => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 캔버스 상태 가져오기
  const canvases = store.get(currentCanvasesAtom);
  if (!canvases) return;

  // 현재 캔버스 상태 확인
  const currentCanvas = store.get(currentCanvasAtom);
  const isDeletingCurrentCanvas = currentCanvas?.id === canvasId;

  // 삭제할 캔버스 인덱스 찾기
  const canvasIndex = canvases.findIndex((c) => c.id === canvasId);
  if (canvasIndex === -1) return;

  // 정렬된 캔버스 배열
  const sortedCanvases = [...canvases].sort((a, b) => a.index - b.index);

  // 트랜잭션으로 일괄 처리
  doc.transact(() => {
    // 캔버스 맵에서 캔버스 삭제
    canvasesMap.delete(canvasId);

    // 남은 캔버스들의 인덱스 재조정
    const remainingCanvases = sortedCanvases.filter((c) => c.id !== canvasId);
    remainingCanvases.forEach((canvas, index) => {
      // 인덱스 업데이트
      const updatedCanvas = {
        ...canvas,
        index: index,
      };

      // 캔버스 맵에 업데이트된 캔버스 저장
      canvasesMap.set(canvas.id, updatedCanvas);
    });
  });

  // 삭제하는 캔버스가 현재 선택된 캔버스인 경우 다른 캔버스로 전환
  if (isDeletingCurrentCanvas && canvases.length > 1) {
    // 현재 맵의 모든 캔버스 가져오기
    const remainingCanvases = Array.from(canvasesMap.values()).sort(
      (a, b) => a.index - b.index,
    );

    if (remainingCanvases.length > 0) {
      // 첫 번째 캔버스를 기본값으로 선택
      const newActiveCanvas = remainingCanvases[0];

      store.set(currentCanvasesAtom, remainingCanvases);
      store.set(currentCanvasAtom, newActiveCanvas);

      if (
        newActiveCanvas!.canvas_layers &&
        newActiveCanvas!.canvas_layers.length > 0
      ) {
        store.set(currentLayersAtom, newActiveCanvas!.canvas_layers);
        store.set(currentLayerAtom, newActiveCanvas!.canvas_layers[0]);
      }
    }
  }

  // 서버에 캔버스 삭제 요청
  const socket = store.get(projectSocketAtom);
  if (socket) {
    socket.emit(
      "deleteCanvas",
      {
        canvasId: canvasId,
        pageId: pageId,
        project: socket.id,
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 삭제 실패:", response.error);
        }
      },
    );
  }
};

// addCanvas 함수를 수정하여 width와 height 매개변수 추가
export const addCanvas = (
  pageId: string,
  session: Session,
  width: number = 1920,
  height: number = 1080,
  color: string = "#FFFFFF",
): Promise<string | null> => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return Promise.resolve(null);

  const doc = getCanvasYdoc();
  if (!doc) return Promise.resolve(null);

  // 현재 캔버스 상태 가져오기
  const canvases = store.get(currentCanvasesAtom) || [];

  // 서버에 캔버스 생성 요청
  const socket = store.get(projectSocketAtom);
  if (!socket) return Promise.resolve(null);

  // Promise로 감싸서 socket 응답을 기다리게 함
  return new Promise((resolve) => {
    socket.emit(
      "createCanvas",
      {
        pageId: pageId,
        project: socket.id,
        canvasData: {
          name: canvases.length + 1,
          width: width,
          height: height,
          color: color,
          created_user_id: session.user.id,
          updated_user_id: session.user.id,
        },
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 생성 실패:", response.error);
          resolve(null);
          return;
        }

        const newCanvas = response.canvas;

        doc.transact(() => {
          // 캔버스 맵에 새 캔버스 추가
          canvasesMap.set(newCanvas.id, newCanvas);

          // 새 캔버스의 레이어가 있다면 레이어맵에도 추가
          if (newCanvas.canvas_layers && newCanvas.canvas_layers.length > 0) {
            const layersMap = doc.getMap<LayerWithContents>(
              `layers-${newCanvas.id}`,
            );
            newCanvas.canvas_layers.forEach((layer: LayerWithContents) => {
              layersMap.set(layer.id, layer);
            });
            // 레이어 변경 감지 설정
            observeLayerChanges(newCanvas.id);
          }
        });

        // 새로 추가된 캔버스를 선택 상태로 설정
        // 맵에서 모든 캔버스 가져오기
        const updatedCanvases = Array.from(canvasesMap.values())
          .filter((canvas) => canvas.page_id === pageId)
          .sort((a, b) => a.index - b.index);

        // 상태 직접 업데이트
        store.set(currentCanvasesAtom, updatedCanvases);
        store.set(currentCanvasAtom, newCanvas);

        // 레이어 정보도 업데이트
        if (newCanvas.canvas_layers && newCanvas.canvas_layers.length > 0) {
          store.set(currentLayersAtom, newCanvas.canvas_layers);
          store.set(currentLayerAtom, newCanvas.canvas_layers[0]);
        }

        // 실제 생성된 캔버스 ID 반환
        resolve(newCanvas.id);
      },
    );
  });
};
export const updateCanvas = (
  pageId: string,
  canvasId: string,
  width: number,
  height: number,
  background: string,
  session: Session,
) => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return;

  const doc = getCanvasYdoc();
  if (!doc) return;

  // 현재 캔버스 객체 가져오기
  const canvas = canvasesMap.get(canvasId);
  if (!canvas) return;

  // 트랜잭션 전에 소켓 저장
  const socket = store.get(projectSocketAtom);

  doc.transact(() => {
    // 변경된 캔버스 객체 생성
    const updatedCanvas = {
      ...canvas,
      width: width,
      height: height,
      background: background,
      updated_user_id: session.user.id,
      updated_at: new Date(),
    };

    // 캔버스 맵에 업데이트된 캔버스 저장
    canvasesMap.set(canvasId, updatedCanvas);
  });

  // 서버에 업데이트 전송
  if (socket) {
    socket.emit(
      "updateCanvas",
      {
        canvasId: canvasId,
        pageId: pageId,
        project: socket.id,
        updates: {
          width: width,
          height: height,
          background: background,
          updated_user_id: session.user.id,
        },
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 속성 변경 실패:", response.error);
          // 서버 업데이트가 실패하면 변경 사항 되돌리기
          if (canvas) {
            doc.transact(() => {
              canvasesMap.set(canvasId, canvas);
            });
          }
        }
      },
    );
  }
};

// 캔버스 복제
export const duplicateCanvas = (
  pageId: string,
  canvasId: string,
  session: Session,
): Promise<string | null> => {
  const canvasesMap = getCanvasesMap();
  if (!canvasesMap) return Promise.resolve(null);

  const doc = getCanvasYdoc();
  if (!doc) return Promise.resolve(null);

  // 원본 캔버스 데이터 가져오기
  const originalCanvas = canvasesMap.get(canvasId);
  if (!originalCanvas) return Promise.resolve(null);

  // 현재 캔버스 상태 가져오기
  const canvases = store.get(currentCanvasesAtom) || [];

  // 현재 페이지의 캔버스만 필터링
  const pageCanvases = canvases.filter((canvas) => canvas.page_id === pageId);

  // 서버에 캔버스 복제 요청
  const socket = store.get(projectSocketAtom);
  if (!socket) return Promise.resolve(null);

  // Promise로 감싸서 socket 응답을 기다리게 함
  return new Promise((resolve) => {
    socket.emit(
      "duplicateCanvas",
      {
        pageId: pageId,
        canvasId: canvasId,
        project: socket.id,
        canvasData: {
          name: `${originalCanvas.name} 복사본`,
          width: originalCanvas.width,
          height: originalCanvas.height,
          background: originalCanvas.background,
          created_user_id: session.user.id,
          updated_user_id: session.user.id,
        },
      },
      (response: any) => {
        if (!response.success) {
          console.error("캔버스 복제 실패:", response.error);
          resolve(null);
          return;
        }

        const newCanvas = response.canvas;

        doc.transact(() => {
          // 캔버스 맵에 새 캔버스 추가
          canvasesMap.set(newCanvas.id, newCanvas);

          // 새 캔버스의 레이어가 있다면 레이어맵에도 추가
          if (newCanvas.canvas_layers && newCanvas.canvas_layers.length > 0) {
            const layersMap = doc.getMap<LayerWithContents>(
              `layers-${newCanvas.id}`,
            );
            newCanvas.canvas_layers.forEach((layer: LayerWithContents) => {
              layersMap.set(layer.id, layer);
            });
            // 레이어 변경 감지 설정
            observeLayerChanges(newCanvas.id);
          }
        });

        // 새로 복제된 캔버스를 선택 상태로 설정
        // 맵에서 모든 캔버스 가져오기
        const updatedCanvases = Array.from(canvasesMap.values())
          .filter((canvas) => canvas.page_id === pageId)
          .sort((a, b) => a.index - b.index);

        // 상태 직접 업데이트
        store.set(currentCanvasesAtom, updatedCanvases);
        store.set(currentCanvasAtom, newCanvas);

        // 레이어 정보도 업데이트
        if (newCanvas.canvas_layers && newCanvas.canvas_layers.length > 0) {
          store.set(currentLayersAtom, newCanvas.canvas_layers);
          store.set(currentLayerAtom, newCanvas.canvas_layers[0]);
        }

        // 실제 생성된 캔버스 ID 반환
        resolve(newCanvas.id);
      },
    );
  });
};
