"use client";
import { getDefaultStore } from "jotai";
import { Session } from "next-auth";
import { io, Socket } from "socket.io-client";
import { currentConnectedUserAtom } from "~/store/atoms";

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-domain.com"
    : "http://localhost:3000";

const store = getDefaultStore();
// socket.ts
let socket: Socket | null = null;

export const initSocket = async (project: string, session: Session) => {
  if (socket?.connected) return; // 이미 연결된 경우 재연결 방지

  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("협업 채널에 접속하였습니다.");
    socket!.emit("connectUser", { project, user: session });
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
