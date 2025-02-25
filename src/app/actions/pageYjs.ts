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

  const currentProviders = store.get(yProvidersAtom);
  store.set(yProvidersAtom, {
    ...currentProviders,
    [project]: wsProvider,
  });

  //페이지 관리용 배열 생성
  const yPages = ydoc.getArray<PageWithCanvases>("pages");
  //초기 상태 설정 - 서버에서 로드된 데이터가 있을 경우
  socket!.emit(
    "getProjectPages",
    { project },
    (initialPages: PageWithCanvases[]) => {
      // 서버로부터 페이지 리스트 가져오기
      if (initialPages && initialPages.length > 0 && yPages.length === 0) {
        // 초기 데이터가 있고 로컬 문서에 데이터가 없는 경우에만 설정
        const sortedPages = initialPages.sort((a, b) => a.index - b.index);
        yPages.insert(0, sortedPages);
      }
      // Jotai 상태 초기화
      const pages = Array.from(yPages);
      store.set(pageCanvasInformationAtom, pages);

      //TODO 로컬 스토리지에 기존 페이지 선택 여부에 따라 초기 페이지 설정을 바꿔줘야 함
      store.set(currentPageAtom, pages[0]);
      store.set(currentCanvasesAtom, pages[0]!.page_canvases);
      store.set(currentCanvasAtom, pages[0]!.page_canvases[0]);
      store.set(currentLayersAtom, pages[0]!.page_canvases[0]!.canvas_layers);
      store.set(currentLayerAtom, pages[0]!.page_canvases[0]!.canvas_layers[0]);

      //페이지 로딩 해제
      store.set(projectLoadingAtom, false);
      store.set(isLoadingAtom, false);
    },
  );

  // 변경 사항 감지 및 Jotai 상태 업데이트
  yPages.observe((event) => {
    const pages = Array.from(yPages);
    store.set(pageCanvasInformationAtom, pages);
    store.set(pagesUpdatedAtom, true);

    // 변경 플래그 리셋
    setTimeout(() => {
      store.set(pagesUpdatedAtom, false);
    }, 2000);

    // 서버에 변경사항 저장 요청
    socket!.emit("savePageOrder", {
      project,
      pages: pages.map((page, index) => ({
        id: page.id,
        index,
      })),
    });
  });
};
