export const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "wss://test.greatwave.co.kr"
    : "ws://localhost:3000";
