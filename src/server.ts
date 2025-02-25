import "module-alias/register";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { projectSocketHandler } from "./server/socket/socketHandler";

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
      origin: dev ? "ws://localhost:3000" : "your-production-domain.com", //TODO 도메인 추가 필요
      methods: ["GET", "POST"],
    },
  });

  projectSocketHandler(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
