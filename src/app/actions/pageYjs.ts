import { Session } from "next-auth";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { SOCKET_URL } from "~/constants/socket";
import { getDefaultStore } from "jotai";
import { pageYdocAtom, yProvidersAtom } from "~/store/yjsAtoms";
import { Socket } from "socket.io-client";
import {
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayerAtom,
  currentLayersAtom,
  currentPageAtom,
  isLoadingAtom,
  pageCanvasInformationAtom,
  pagesUpdatedAtom,
  PageWithCanvases,
  projectLoadingAtom,
} from "~/store/atoms";

const store = getDefaultStore();

export const initPageYjs = (
  socket: Socket,
  project: string,
  session: Session,
) => {
  // 페이지 동기화 아톰 초기화
  const ydoc = new Y.Doc();
  store.set(pageYdocAtom, ydoc);

  // 웹소켓 연결
  const wsProvider = new SocketIOProvider(SOCKET_URL, project, ydoc, socket);

  // 페이지 관리용 맵 생성
  const yPagesMap = ydoc.getMap<PageWithCanvases>("pagesMap");

  wsProvider.on("status", ({ status }: { status: string }) => {
    console.log(status); // Logs "connected" or "disconnected"
  });

  // 초기 상태 설정 - 서버에서 로드된 데이터가 있을 경우
  socket!.emit(
    "getProjectPages",
    { project },
    (initialPages: PageWithCanvases[]) => {
      // 서버로부터 페이지 리스트 가져오기
      if (initialPages && initialPages.length > 0 && yPagesMap.size === 0) {
        // 초기 데이터가 있고 로컬 문서에 데이터가 없는 경우에만 설정
        const sortedPages = initialPages.sort((a, b) => a.index - b.index);

        // Y.Map에 페이지들 추가
        ydoc.transact(() => {
          sortedPages.forEach((page) => {
            yPagesMap.set(page.id, page);
          });
        });
      }

      // Jotai 상태 초기화 - 정렬된 페이지 배열로 변환
      const pages = Array.from(yPagesMap.values()).sort(
        (a, b) => a.index - b.index,
      );
      store.set(pageCanvasInformationAtom, pages);

      // 초기 페이지 설정
      if (pages.length > 0) {
        store.set(currentPageAtom, pages[0]);

        if (pages[0]!.page_canvases?.length > 0) {
          store.set(currentCanvasesAtom, pages[0]!.page_canvases);
          store.set(currentCanvasAtom, pages[0]!.page_canvases[0]);

          if (pages[0]!.page_canvases[0]!.canvas_layers?.length > 0) {
            store.set(
              currentLayersAtom,
              pages[0]!.page_canvases[0]!.canvas_layers,
            );
            store.set(
              currentLayerAtom,
              pages[0]!.page_canvases[0]!.canvas_layers[0],
            );
          }
        }
      }

      // 페이지 로딩 해제
      store.set(projectLoadingAtom, false);
      store.set(isLoadingAtom, false);
    },
  );

  // 변경 사항 감지 및 Jotai 상태 업데이트
  yPagesMap.observe((event) => {
    console.log("변경 감지!!");
    // Y.Map 변경 감지 후 정렬된 배열로 변환
    const pages = Array.from(yPagesMap.values()).sort(
      (a, b) => a.index - b.index,
    );
    store.set(pageCanvasInformationAtom, pages);
    store.set(pagesUpdatedAtom, true);

    // 변경 플래그 리셋
    setTimeout(() => {
      store.set(pagesUpdatedAtom, false);
    }, 2000);

    // 서버에 변경사항 저장 요청
    socket!.emit("savePages", {
      project,
      pages: pages.map((page, index) => ({
        ...page,
        index,
      })),
    });
  });
};

// 페이지 문서 및 맵 가져오기 함수
export const getPageYdoc = () => store.get(pageYdocAtom);

export const getYPagesMap = () => {
  const ydoc = getPageYdoc();
  return ydoc ? ydoc.getMap<PageWithCanvases>("pagesMap") : null;
};

// 페이지 순서 변경 함수
export const reorderPages = (sourceIndex: number, destinationIndex: number) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return;

  const doc = getPageYdoc();
  if (!doc) return;

  // 페이지 배열 가져오기
  const pages = Array.from(yPagesMap.values()).sort(
    (a, b) => a.index - b.index,
  );

  // 이동할 페이지
  const movingPage = pages[sourceIndex];
  if (!movingPage) return;

  doc.transact(() => {
    // 페이지 순서 재정렬
    if (sourceIndex < destinationIndex) {
      // 아래로 이동: 사이에 있는 항목들 인덱스 감소
      for (let i = sourceIndex + 1; i <= destinationIndex; i++) {
        const page = pages[i];
        page!.index = i - 1;
        yPagesMap.set(page!.id, page!);
      }
    } else {
      // 위로 이동: 사이에 있는 항목들 인덱스 증가
      for (let i = destinationIndex; i < sourceIndex; i++) {
        const page = pages[i];
        page!.index = i + 1;
        yPagesMap.set(page!.id, page!);
      }
    }

    // 이동된 페이지 인덱스 업데이트
    movingPage.index = destinationIndex;
    yPagesMap.set(movingPage.id, movingPage);
  });
};

// 페이지 추가 함수
export const addPage = (
  pageName: string,
  session: Session,
  projectId: string,
) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return null;

  const doc = getPageYdoc();
  if (!doc) return null;

  // 기존 페이지 수 확인
  const pages = Array.from(yPagesMap.values());
  const pageCount = pages.length;

  // 기본 캔버스 레이어 생성
  const defaultLayer = {
    id: generateUniqueId(),
    name: "레이어 1",
    visible: true,
    locked: false,
    index: 0,
    shapes: [],
  };

  // 기본 캔버스 생성
  const defaultCanvas = {
    id: generateUniqueId(),
    name: "캔버스 1",
    index: 0,
    canvas_layers: [defaultLayer],
  };

  const newPageId = generateUniqueId();
  const newPage: PageWithCanvases = {
    id: newPageId,
    name: pageName,
    index: pageCount, // 맨 뒤에 추가
    created_at: new Date(),
    created_user_id: session.user.id,
    updated_at: new Date(),
    updated_user_id: session.user.id,
    project_id: projectId,
    page_canvases: [], // 기본 캔버스 추가
  };

  doc.transact(() => {
    yPagesMap.set(newPageId, newPage);
  });

  return newPageId;
};

// 페이지 삭제 함수
export const deletePage = (pageId: string) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return;

  const doc = getPageYdoc();
  if (!doc) return;

  // 현재 페이지 확인
  const currentPage = store.get(currentPageAtom);
  const deletingCurrentPage = currentPage?.id === pageId;

  // 모든 페이지 가져오기
  const pages = Array.from(yPagesMap.values()).sort(
    (a, b) => a.index - b.index,
  );
  const pageIndex = pages.findIndex((page) => page.id === pageId);

  if (pageIndex === -1) return;

  doc.transact(() => {
    // 페이지 삭제
    yPagesMap.delete(pageId);

    // 인덱스 재정렬
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (page!.id !== pageId && page!.index > pageIndex) {
        page!.index = page!.index - 1;
        yPagesMap.set(page!.id, page!);
      }
    }
  });

  // 활성 페이지가 삭제된 경우 다른 페이지로 전환
  if (deletingCurrentPage) {
    const updatedPages = Array.from(yPagesMap.values()).sort(
      (a, b) => a.index - b.index,
    );
    if (updatedPages.length > 0) {
      // 가능하면 이전 인덱스의 페이지로, 아니면 첫 페이지로
      const newActiveIndex = Math.min(pageIndex, updatedPages.length - 1);
      const newActivePage = updatedPages[newActiveIndex];
      store.set(currentPageAtom, newActivePage);

      if (newActivePage!.page_canvases?.length > 0) {
        store.set(currentCanvasesAtom, newActivePage!.page_canvases);
        store.set(currentCanvasAtom, newActivePage!.page_canvases[0]);

        if (newActivePage!.page_canvases[0]!.canvas_layers?.length > 0) {
          store.set(
            currentLayersAtom,
            newActivePage!.page_canvases[0]!.canvas_layers,
          );
          store.set(
            currentLayerAtom,
            newActivePage!.page_canvases[0]!.canvas_layers[0],
          );
        }
      }
    } else {
      // // 페이지가 없는 경우 관련 상태 초기화
      // store.set(currentPageAtom, null);
      // store.set(currentCanvasesAtom, []);
      // store.set(currentCanvasAtom, null);
      // store.set(currentLayersAtom, []);
      // store.set(currentLayerAtom, null);
    }
  }
};

export const renamePage = (
  pageId: string,
  newName: string,
  session: Session,
) => {
  const doc = getPageYdoc();
  if (!doc) return null;
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return;

  const page = yPagesMap.get(pageId);
  if (!page) return;

  doc.transact(() => {
    // 기존 객체의 속성만 업데이트
    page.name = newName;
    page.updated_at = new Date();
    page.updated_user_id = session.user.id;

    // 변경된 객체를 다시 설정 (삭제하지 않음)
    yPagesMap.set(pageId, page);
  });

  // 현재 페이지를 업데이트하는 경우 UI 상태도 업데이트
  const currentPage = store.get(currentPageAtom);
  if (currentPage?.id === pageId) {
    store.set(currentPageAtom, {
      ...currentPage,
      name: newName,
    });
  }
};

// 캔버스 추가 함수
export const addCanvas = (
  pageId: string,
  canvasName: string,
  session: Session,
) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return null;

  const doc = getPageYdoc();
  if (!doc) return null;

  const page = yPagesMap.get(pageId);
  if (!page) return null;

  // 기본 레이어 생성
  const defaultLayer = {
    id: generateUniqueId(),
    name: "레이어 1",
    visible: true,
    locked: false,
    index: 0,
    shapes: [],
  };

  // 캔버스 ID 생성
  const canvasId = generateUniqueId();

  // 새 캔버스 생성
  const newCanvas = {
    id: canvasId,
    name: canvasName,
    index: page.page_canvases?.length || 0,
    created_at: new Date(),
    created_user_id: session.user.id,
    updated_at: new Date(),
    updated_user_id: session.user.id,
    canvas_layers: [defaultLayer],
  };

  doc.transact(() => {
    // 페이지의 캔버스 목록 업데이트
    const updatedPage = {
      ...page,
      page_canvases: [...(page.page_canvases || []), newCanvas],
    };

    //yPagesMap.set(pageId, updatedPage);
  });

  return canvasId;
};

// 레이어 추가 함수
export const addLayer = (
  pageId: string,
  canvasId: string,
  layerName: string,
  session: Session,
) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return null;

  const doc = getPageYdoc();
  if (!doc) return null;

  const page = yPagesMap.get(pageId);
  if (!page) return null;

  const canvasIndex =
    page.page_canvases?.findIndex((c) => c.id === canvasId) ?? -1;
  if (canvasIndex === -1) return null;

  // 새 레이어 생성
  const newLayer = {
    id: generateUniqueId(),
    name: layerName,
    visible: true,
    locked: false,
    index: page.page_canvases[canvasIndex]!.canvas_layers?.length || 0,
    shapes: [],
  };

  doc.transact(() => {
    // 페이지의 캔버스 목록 복사
    const updatedCanvases = [...(page.page_canvases || [])];

    // // 특정 캔버스의 레이어 목록 업데이트
    // updatedCanvases[canvasIndex] = {
    //   ...updatedCanvases[canvasIndex],
    //   canvas_layers: [
    //     ...(updatedCanvases[canvasIndex].canvas_layers || []),
    //     newLayer,
    //   ],
    // };

    // 페이지 업데이트
    const updatedPage = {
      ...page,
      page_canvases: updatedCanvases,
      updated_at: new Date(),
      updated_user_id: session.user.id,
    };

    yPagesMap.set(pageId, updatedPage);
  });

  return newLayer.id;
};

// 유틸리티 함수
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export const getYProvider = (projectId: string) => {
  const providers = store.get(yProvidersAtom);
  return providers?.[projectId] || null;
};
