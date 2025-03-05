"use client";
import { getDefaultStore } from "jotai";
import { Session } from "next-auth";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "~/constants/socket";
import { currentConnectedUserAtom } from "~/store/atoms";
import { initPageYjs } from "./yjs/pageYjs";
import { projectSocketAtom } from "~/store/yjsAtoms";
import { initCanvasYjs } from "./yjs/canvasYjs";

const store = getDefaultStore();

let socket: Socket | null = null;

let socketInitializing = false; // 소켓 초기화 진행 중인지 추적하는 변수

export const initProjectSocket = async (project: string, session: Session) => {
  if (socket?.connected || socketInitializing) return; // 이미 연결 중이거나 초기화 중인 경우 종료

  socketInitializing = true; // 초기화 시작 표시

  try {
    // socket = io(SOCKET_URL, {
    //   autoConnect: true,
    //   reconnection: true,
    //   transports: ["websocket"],
    // });
    socket = io({
      autoConnect: true,
      reconnection: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("협업 채널에 접속하였습니다.");
      socket!.emit("connectUser", { project, user: session });

      store.set(projectSocketAtom, socket);

      initPageYjs(project, session);
      initCanvasYjs(project, session);

      socketInitializing = false; // 연결 완료 후 초기화 상태 해제
    });

    socket.on("connect_error", () => {
      socketInitializing = false; // 연결 오류 시 초기화 상태 해제
    });

    // 기존 이벤트 리스너 제거 후 재등록
    socket.off("updateUserList");
    socket.on("updateUserList", (data) => {
      store.set(currentConnectedUserAtom, data);
    });
  } catch (error) {
    socketInitializing = false; // 예외 발생 시 초기화 상태 해제
    console.error("소켓 연결 오류:", error);
  }
};

export const disconnectSocket = async () => {
  if (socket) {
    console.log("소켓 연결 종료");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
