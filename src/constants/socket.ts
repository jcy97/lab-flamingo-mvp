export const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "wss://your-domain.com"
    : "ws://localhost:3000";
