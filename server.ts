import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000", 10);

app.prepare().then(() => {
  const httpServer: HTTPServer = createServer((req, res) => {
    handle(req, res);
  });

  // Socket.io 서버 초기화
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? "http://localhost:3000" : "your-production-domain.com", //TODO 도메인 추가 필요
      methods: ["GET", "POST"],
    },
  });

  // Socket.io 이벤트 핸들러
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 커스텀 이벤트 핸들링
    socket.on("chatMessage", (msg) => {
      console.log("Received message:", msg);
      io.emit("newMessage", msg); // 모든 클라이언트에 브로드캐스트
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
