import "module-alias/register";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { projectSocketHandler } from "./server/socket/socketHandler";
import { YSocketIO } from "y-socket.io/dist/server";

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
      origin: dev ? "http://localhost:3000" : "https://test.greatwave.co.kr",
      methods: ["GET", "POST"],
    },
  });

  // 기존 Socket.io 핸들러 설정
  projectSocketHandler(io);

  // Y-Socket.io 서버 초기화
  // NOTE: Y-Socket.io uses socket namespaces that match the regex /^\/yjs\|.*$/
  // (예: 'ws://localhost:3000/yjs|my-document-room')
  const ysocketio = new YSocketIO(io);
  ysocketio.initialize();

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
