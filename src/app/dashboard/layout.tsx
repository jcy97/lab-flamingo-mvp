"use client";
import { useEffect } from "react";
import Sidebar from "~/components/dashboard/Sidebar";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-domain.com"
    : "http://localhost:3000";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to Socket.io server");
    });

    socket.on("newMessage", (message) => {
      console.log("New message:", message);
    });

    // 메시지 전송 예시
    const sendMessage = () => {
      socket.emit("chatMessage", {
        text: "Hello World",
        user: "Anonymous",
      });
    };

    return () => {
      socket.disconnect();
    };
  }, []);
  return (
    <>
      <main className="flex h-screen bg-neutral-800">
        <Sidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
