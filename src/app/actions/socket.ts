"use client";
import { getDefaultStore } from "jotai";
import { Session } from "next-auth";
import { io, Socket } from "socket.io-client";
import { currentConnectedUserAtom } from "~/store/atoms";

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-domain.com"
    : "http://localhost:3000";

let socket: Socket | null = null;

const store = getDefaultStore();

export const initSocket = async (project: string, session: Session) => {
  socket = io(SOCKET_URL);
  socket.on("connect", () => {
    console.log("협업 채널에 접속하였습니다.");
    socket!.emit("connectUser", { project: project, user: session });
  });

  socket.on("updateUserList", (data) => {
    console.log("사용자 리스트가 도착했습니다.");
    store.set(currentConnectedUserAtom, data);
  });
};

export const disconnectSocket = async () => {
  if (socket) {
    console.log("소켓 연결 종료");
    socket.disconnect();
    socket = null;
  }
};
