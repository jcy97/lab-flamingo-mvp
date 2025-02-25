import type { Namespace, Server, Socket } from "socket.io";
import {
  addNewConnectedUser,
  getConnectedUsers,
  removeConnectedUser,
} from "../store/serverStore";
import { getPagesWithCanvases } from "../../app/actions/canvas";

// 소켓 이벤트 핸들러 함수 정의
export const projectSocketHandler = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    console.log(`클라이언트 접속: ${socket.id}`);

    socket.on("connectUser", (data) => {
      const { project, user } = data; // 유저 정보와 프로젝트 정보 추가
      socket.join(project); // 해당 프로젝트에 가입
      // 유저 정보를 저장하는 함수 호출
      addNewConnectedUser({ socketId: socket.id, user, project });

      // 모든 클라이언트에게 유저 리스트 전파
      const userList = getConnectedUsers(project);
      io.to(project).emit("updateUserList", userList);
    });

    /* 
      페이지 동기화 처리
    */
    socket.on("getProjectPages", async ({ project }, callback) => {
      try {
        const canvasInformation = await getPagesWithCanvases(project!);
        callback(canvasInformation);
      } catch (error) {
        console.error("페이지 목록 불러오기 실패");
        callback([]);
      }
    });

    socket.on("disconnect", () => {
      console.log("사용자 연결이 종료되었습니다.");
      const response = removeConnectedUser(socket.id);

      response.forEach((item) => {
        io.to(item.project).emit("updateUserList", item.information);
      });
    });
  });
};
