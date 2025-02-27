"use client";
import { getDefaultStore } from "jotai";
import { Session } from "next-auth";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "~/constants/socket";
import { currentConnectedUserAtom } from "~/store/atoms";
import { initPageYjs } from "./yjs/pageYjs";
import { projectSocketAtom } from "~/store/yjsAtoms";
import { initCanvasYjs } from "./yjs/canvasYjs";
import { SocketIOProvider } from "y-socket.io";

const store = getDefaultStore();
// socket.ts
let socket: Socket | null = null;

export const initProjectSocket = async (project: string, session: Session) => {
  if (socket?.connected) return; // 이미 연결된 경우 재연결 방지

  socket = io(SOCKET_URL, {
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
  });

  // 기존 이벤트 리스너 제거 후 재등록
  socket.off("updateUserList");
  socket.on("updateUserList", (data) => {
    console.log("사용자 리스트 도착");
    store.set(currentConnectedUserAtom, data);
  });
};

export const disconnectSocket = async () => {
  if (socket) {
    console.log("소켓 연결 종료");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
