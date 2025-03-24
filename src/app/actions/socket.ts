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
  // 이미 초기화 중인 경우 중복 실행 방지
  if (socketInitializing) {
    console.log("소켓 초기화가 이미 진행 중입니다.");
    return;
  }

  socketInitializing = true; // 초기화 시작 표시
  console.log("소켓 초기화 시작");

  try {
    // 기존 소켓 연결 해제
    await disconnectSocket();

    // 충분한 시간을 두고 새 소켓 연결 생성
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 완전히 새로운 소켓 인스턴스 생성
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      transports: ["websocket"],
    });

    console.log("새 소켓 인스턴스 생성됨");

    socket.on("connect", () => {
      console.log("협업 채널에 접속하였습니다.");
      socket!.emit("connectUser", { project, user: session });

      store.set(projectSocketAtom, socket);

      initPageYjs(project, session);
      initCanvasYjs(project, session);

      socketInitializing = false; // 연결 완료 후 초기화 상태 해제
    });

    socket.on("connect_error", (error) => {
      console.error("소켓 연결 오류:", error);
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
  return new Promise<void>((resolve) => {
    if (socket) {
      console.log("소켓 연결 종료 시작");

      // 모든 이벤트 리스너 제거
      socket.removeAllListeners();

      // 소켓 연결 종료
      socket.disconnect();

      // 소켓 변수 초기화
      socket = null;

      console.log("소켓 연결 종료 완료");

      // 소켓 완전히 종료 시간 확보
      setTimeout(() => {
        resolve();
      }, 200);
    } else {
      console.log("종료할 소켓 연결이 없음");
      resolve();
    }
  });
};
