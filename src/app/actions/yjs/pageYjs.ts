import { Session } from "next-auth";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { SOCKET_URL } from "~/constants/socket";
import { getDefaultStore } from "jotai";
import {
  pageYdocAtom,
  projectSocketAtom,
  yjsProviderAtom,
} from "~/store/yjsAtoms";
import { Page } from "@prisma/mongodb-client";
import {
  canvasLayersAtom,
  CanvasWithLayers,
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayerAtom,
  currentLayersAtom,
  currentPageAtom,
  isLoadingAtom,
  pageCanvasesAtom,
  pageCanvasInformationAtom,
  pagesAtom,
  pagesUpdatedAtom,
  PageWithCanvases,
  projectLoadingAtom,
} from "~/store/atoms";

const store = getDefaultStore();

export const initPageYjs = (project: string, session: Session) => {
  // 페이지 동기화 아톰 초기화
  const ydoc = new Y.Doc();
  store.set(pageYdocAtom, ydoc);

  const socket = store.get(projectSocketAtom);

  // 웹소켓 연결
  const wsProvider = new SocketIOProvider(
    SOCKET_URL,
    `page-${project}`,
    ydoc,
    socket!,
  );

  // 페이지 관리용 맵 생성
  const yPagesMap = ydoc.getMap<Page>("pagesMap");

  wsProvider.on("status", ({ status }: { status: string }) => {
    // Status "connected" or "disconnected"
    if (status === "connected") {
      store.set(yjsProviderAtom, wsProvider);
    } else if (status === "dusconnected") {
      store.set(yjsProviderAtom, null);
    }
  });

  // 서버 데이터와 YJS 동기화 함수
  socket!.emit(
    "getProjectPages",
    { project },
    (initialPages: PageWithCanvases[]) => {
      // 서버로부터 페이지 리스트 가져오기
      if (initialPages && initialPages.length > 0) {
        const sortedPages = initialPages
          .sort((a, b) => a.index - b.index)
          .map(({ page_canvases, ...rest }) => {
            // 페이지별 캔버스 리스트 저장
            store.set(pageCanvasesAtom, (prev) => ({
              ...prev,
              [rest.id]: page_canvases,
            }));
            // 캔버스별 레이어 데이터 저장
            if (page_canvases && page_canvases.length > 0) {
              page_canvases.forEach((canvas) => {
                if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
                  store.set(canvasLayersAtom, (prev) => ({
                    ...prev,
                    [canvas.id]: canvas.canvas_layers,
                  }));
                }
              });
            }
            return rest;
          });

        // YJS 데이터를 서버 데이터로 완전히 동기화
        ydoc.transact(() => {
          // 기존 YJS 맵의 모든 페이지 ID 수집
          const existingPageIds = new Set(yPagesMap.keys());

          // 서버에서 가져온 페이지 추가/업데이트
          sortedPages.forEach((page) => {
            yPagesMap.set(page.id, page);
            existingPageIds.delete(page.id); // 처리된 ID는 세트에서 제거
          });

          // 서버에 없는 페이지는 YJS에서도 제거
          existingPageIds.forEach((pageId) => {
            yPagesMap.delete(pageId);
          });
        });

        // Jotai 상태 초기화 - 정렬된 페이지 배열로 변환
        const pages = Array.from(yPagesMap.values()).sort(
          (a, b) => a.index - b.index,
        );

        store.set(pageCanvasInformationAtom, initialPages);
        // 초기 페이지 설정
        if (pages.length > 0) {
          store.set(currentPageAtom, initialPages[0]);

          if (initialPages[0]!.page_canvases?.length > 0) {
            store.set(currentCanvasesAtom, initialPages[0]!.page_canvases);
            store.set(currentCanvasAtom, initialPages[0]!.page_canvases[0]);

            if (initialPages[0]!.page_canvases[0]!.canvas_layers?.length > 0) {
              store.set(
                currentLayersAtom,
                initialPages[0]!.page_canvases[0]!.canvas_layers,
              );
              store.set(
                currentLayerAtom,
                initialPages[0]!.page_canvases[0]!.canvas_layers[0],
              );
            }
          }
        }
      }

      // 페이지 로딩 해제
      store.set(projectLoadingAtom, false);
      store.set(isLoadingAtom, false);
    },
  );
  yPagesMap.observe((event) => {
    console.log("페이지 변경 감지!!");

    // 1. 단순히 인덱스만 바뀐 경우를 판단하기 위한 변수
    let isOnlyIndexChange = true;
    let hasAddOrDelete = false;

    // 변경 항목 분석
    event.changes.keys.forEach((change, key) => {
      if (change.action === "add" || change.action === "delete") {
        hasAddOrDelete = true;
        isOnlyIndexChange = false;
      }
    });

    // 2. Y.Map 변경 감지 후 정렬된 배열로 변환
    const pages = Array.from(yPagesMap.values()).sort(
      (a, b) => a.index - b.index,
    );

    // 3. Jotai 상태 업데이트
    store.set(pagesAtom, pages);
    store.set(pagesUpdatedAtom, true);

    // 4. 변경 플래그 리셋
    setTimeout(() => {
      store.set(pagesUpdatedAtom, false);
    }, 2000);
  });

  socket!.on("pageAdded", (newPage) => {
    console.log("다른 클라이언트에서 페이지 추가 감지:", newPage);

    // 1. 페이지에 캔버스 정보가 있으면 pageCanvasesAtom에 추가
    if (newPage) {
      // 새 페이지의 캔버스 정보를 pageCanvasesAtom에 추가
      store.set(pageCanvasesAtom, (prev) => ({
        ...prev,
        [newPage.id]: newPage.page_canvases || [], // 새 페이지 ID를 키로 캔버스 리스트 추가
      }));

      // 2. 캔버스 레이어 정보도 처리
      if (newPage.page_canvases && newPage.page_canvases.length > 0) {
        newPage.page_canvases.forEach((canvas: CanvasWithLayers) => {
          if (canvas.canvas_layers && canvas.canvas_layers.length > 0) {
            store.set(canvasLayersAtom, (prev) => ({
              ...prev,
              [canvas.id]: canvas.canvas_layers,
            }));
          }
        });
      }
    }
  });
};

// 페이지 문서 및 맵 가져오기 함수
export const getPageYdoc = () => store.get(pageYdocAtom);

export const getYPagesMap = () => {
  const ydoc = getPageYdoc();
  return ydoc ? ydoc.getMap<PageWithCanvases>("pagesMap") : null;
};

//페이지 순서 변경 함수
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

  // 복사본 만들기를 방지하기 위해 트랜잭션을 사용하고,
  // 전체 페이지 배열을 새로 정렬하는 방식으로 접근
  doc.transact(() => {
    // 먼저 이동할 페이지를 배열에서 제거
    const newPages = [...pages];
    newPages.splice(sourceIndex, 1);

    // 대상 위치에 페이지 삽입
    newPages.splice(destinationIndex, 0, movingPage);

    // 전체 페이지 인덱스 재할당
    newPages.forEach((page, index) => {
      // 원본 객체의 인덱스만 수정하고 Y.Map에 업데이트
      const updatedPage = { ...page, index };
      yPagesMap.set(page.id, updatedPage);
    });
  });

  // 서버에 변경 내용 즉시 저장 요청 (선택사항)
  const socket = store.get(projectSocketAtom);
  const project = movingPage.project_id;
  if (socket && project) {
    // Y.Map에서 현재 정렬된 페이지 목록 가져오기
    const updatedPages = Array.from(yPagesMap.values()).sort(
      (a, b) => a.index - b.index,
    );

    socket.emit("reorderPages", {
      project,
      pages: updatedPages,
    });
  }
};

// 페이지 추가 함수
export const addPage = (
  pageName: string,
  session: Session,
  projectId: string,
) => {
  const yPagesMap = getYPagesMap();
  if (!yPagesMap) return null;
  let newPageId = "aaaa";
  const doc = getPageYdoc();
  if (!doc) return null;

  // 소켓을 통해 서버에 새 페이지 생성 요청
  const socket = store.get(projectSocketAtom); // 소켓 인스턴스 가져오기

  socket?.emit(
    "createNewPage",
    {
      project: projectId,
      pageData: {
        name: pageName,
        user_id: session.user.id,
      },
    },
    (response: any) => {
      if (response.success) {
        // 서버에서 생성 성공 시, 로컬 Y.doc에 추가
        const newPage = response.page;
        newPageId = newPage.id;
        doc.transact(() => {
          yPagesMap.set(newPage.id, newPage);
        });

        // 새 페이지의 캔버스 정보를 pageCanvasesAtom에 추가
        store.set(pageCanvasesAtom, (prev) => ({
          ...prev,
          [newPage.id]: newPage.page_canvases || [], // 새 페이지 ID를 키로 캔버스 리스트 추가
        }));

        // 옵션: 현재 페이지로 설정
        store.set(currentPageAtom, newPage);

        if (newPage.page_canvases?.length > 0) {
          store.set(currentCanvasesAtom, newPage.page_canvases);
          store.set(currentCanvasAtom, newPage.page_canvases[0]);

          if (newPage.page_canvases[0]?.canvas_layers?.length > 0) {
            store.set(
              currentLayersAtom,
              newPage.page_canvases[0].canvas_layers,
            );
            store.set(
              currentLayerAtom,
              newPage.page_canvases[0].canvas_layers[0],
            );
          }
        }
      } else {
        console.error("페이지 생성 실패:", response.error);
      }
    },
  );

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

  // 서버에 페이지 삭제 요청
  const socket = store.get(projectSocketAtom);
  const deletedPage = pages[pageIndex];

  if (socket && deletedPage) {
    socket.emit(
      "deletePage",
      {
        pageId: pageId,
        project: deletedPage.project_id,
      },
      (response: any) => {
        if (response.success) {
          // 서버에서 성공적으로 삭제됐을 때 로컬 Y.doc 업데이트
          doc.transact(() => {
            // 페이지 삭제
            yPagesMap.delete(pageId);

            // 인덱스 재정렬 (서버에서도 처리되지만, 로컬에서도 즉시 반영)
            for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              if (page!.id !== pageId && page!.index > pageIndex) {
                page!.index = page!.index - 1;
                yPagesMap.set(page!.id, page!);
              }
            }
          });
          store.set(pageCanvasesAtom, (prev) => {
            const newState = { ...prev }; // 기존 상태 복사
            delete newState[pageId]; // 특정 페이지 ID의 값을 삭제
            return newState; // 새로운 상태 반환
          });

          // 활성 페이지가 삭제된 경우 다른 페이지로 전환
          if (deletingCurrentPage) {
            const updatedPages = Array.from(yPagesMap.values()).sort(
              (a, b) => a.index - b.index,
            );
            if (updatedPages.length > 0) {
              // 가능하면 이전 인덱스의 페이지로, 아니면 첫 페이지로
              const newActiveIndex = Math.min(
                pageIndex,
                updatedPages.length - 1,
              );
              const newActivePage = updatedPages[newActiveIndex];
              store.set(currentPageAtom, newActivePage);

              if (newActivePage!.page_canvases?.length > 0) {
                store.set(currentCanvasesAtom, newActivePage!.page_canvases);
                store.set(currentCanvasAtom, newActivePage!.page_canvases[0]);

                if (
                  newActivePage!.page_canvases[0]!.canvas_layers?.length > 0
                ) {
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
              // 페이지가 없는 경우 관련 상태 초기화
              const data = store.get(pageCanvasInformationAtom);
              if (data && data.length > 0) {
                store.set(currentPageAtom, data[0]);
                store.set(currentCanvasesAtom, data[0]!.page_canvases!);
                store.set(currentCanvasAtom, data[0]!.page_canvases[0]);
                store.set(
                  currentLayersAtom,
                  data[0]!.page_canvases[0]!.canvas_layers!,
                );
                store.set(
                  currentLayerAtom,
                  data[0]!.page_canvases[0]!.canvas_layers[0],
                );
              }
            }
          }
        } else {
          console.error("페이지 삭제 실패:", response.error);
          // 실패 시 사용자에게 알림 (선택사항)
        }
      },
    );
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

  // 서버로 이 페이지가 변경되었음을 알리고 저장 요청
  const socket = store.get(projectSocketAtom);
  if (socket) {
    // 서버에 페이지 이름 변경 요청
    socket.emit("updatePage", {
      pageId: pageId,
      project: page.project_id,
      updates: {
        name: newName,
        updated_at: new Date(), // 서버에서 처리하도록 Date 객체 전달
        updated_user_id: session.user.id,
      },
    });
  }

  doc.transact(() => {
    // YDoc에 변경사항 적용
    const updatedPage = {
      ...page,
      name: newName,
      // Date 객체를 그대로 유지
      updated_at: new Date(),
      updated_user_id: session.user.id,
    };

    // 변경된 객체를 YMap에 설정
    yPagesMap.set(pageId, updatedPage);
  });

  // 현재 페이지를 업데이트하는 경우 UI 상태도 업데이트
  const currentPage = store.get(currentPageAtom);
  if (currentPage?.id === pageId) {
    store.set(currentPageAtom, {
      ...currentPage,
      name: newName,
      updated_at: new Date(),
    });
  }
};
