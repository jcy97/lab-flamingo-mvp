import type { Namespace, Server, Socket } from "socket.io";
import {
  addNewConnectedUser,
  getConnectedUsers,
  removeConnectedUser,
} from "../store/serverStore";
import { getPagesWithCanvases } from "../../app/actions/canvas";
import {
  createCanvas,
  createNewPageWithDefaults,
  deleteCanvas,
  deletePage,
  reorderCanvases,
  updateCanvas,
  updatePage,
  updatePagesOrder,
} from "../service/canvas";

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

    /*****************
      페이지 동기화 처리
    ******************/
    socket.on("getProjectPages", async ({ project }, callback) => {
      try {
        const canvasInformation = await getPagesWithCanvases(project!);
        callback(canvasInformation);
      } catch (error) {
        console.error("페이지 목록 불러오기 실패");
        callback([]);
      }
    });

    socket.on("reorderPages", async ({ project, pages }) => {
      try {
        // 페이지 트랜잭션으로 저장 작업을 수행
        await updatePagesOrder(project, pages);

        // 성공적으로 저장되었음을 알림 (선택적)
        socket.emit("pagesSaved", { success: true });
      } catch (error) {
        console.error("페이지 저장 실패:", error);
        socket.emit("pagesSaved", {
          success: false,
          error: "페이지 저장에 실패했습니다.",
        });
      }
    });

    // 신규 페이지 생성 이벤트 핸들러 추가
    socket.on("createNewPage", async (data, callback) => {
      try {
        const { project, pageData } = data;

        // 새 페이지 트랜잭션으로 생성 작업을 수행
        const result = await createNewPageWithDefaults(project, pageData);

        // 콜백으로 결과 반환
        callback(result);

        // 성공했을 경우, 프로젝트의 다른 사용자들에게 페이지 추가 알림 (선택적)
        if (result.success) {
          socket.to(project).emit("pageAdded", result.page);
        }
      } catch (error) {
        console.error("페이지 생성 실패:", error);
        callback({
          success: false,
          error: "페이지 생성에 실패했습니다.",
        });
      }
    });

    socket.on("updatePage", async ({ pageId, project, updates }) => {
      try {
        // updatePage 함수 호출
        const result = await updatePage(pageId, {
          name: updates.name,
          updated_user_id: updates.updated_user_id,
          // updated_at은 함수 내부에서 새로 생성됨
        });

        // 성공적으로 업데이트되었음을 클라이언트에 알림
        socket.emit("pageUpdated", {
          success: result.success,
          pageId,
          page: result.page,
          error: result.error,
        });

        // 동일 프로젝트 내 다른 클라이언트에게도 변경 사항 알림
        if (result.success) {
          socket.to(project).emit("pageUpdated", {
            success: true,
            pageId,
            page: result.page,
          });
        }
      } catch (error) {
        console.error("페이지 업데이트 처리 실패:", error);
        socket.emit("pageUpdated", {
          success: false,
          pageId,
          error: "페이지 업데이트 처리에 실패했습니다.",
        });
      }
    });

    // 페이지 삭제 이벤트 핸들러 추가
    socket.on("deletePage", async ({ pageId, project }, callback) => {
      try {
        // 페이지 삭제 작업 수행
        const result = await deletePage(pageId);

        // 콜백으로 결과 반환
        callback(result);

        // 성공했을 경우, 프로젝트의 다른 사용자들에게 페이지 삭제 알림
        if (result.success) {
          socket.to(project).emit("pageDeleted", { pageId, success: true });
        }
      } catch (error) {
        console.error("페이지 삭제 실패:", error);
        callback({
          success: false,
          error: "페이지 삭제에 실패했습니다.",
        });
      }
    });

    socket.on(
      "updateCanvas",
      async ({ canvasId, pageId, project, updates }, callback) => {
        try {
          // updateCanvas 함수 호출
          const result = await updateCanvas(canvasId, {
            name: updates.name,
            updated_user_id: updates.updated_user_id,
          });

          // 성공적으로 업데이트되었음을 클라이언트에 알림
          callback({
            success: result.success,
            canvas: result.canvas,
            error: result.error,
          });

          // 동일 프로젝트 내 다른 클라이언트에게도 변경 사항 알림
          if (result.success) {
            socket.to(project).emit("canvasUpdated", {
              success: true,
              canvasId,
              pageId,
              canvas: result.canvas,
            });
          }
        } catch (error) {
          console.error("캔버스 업데이트 처리 실패:", error);
          callback({
            success: false,
            error: "캔버스 업데이트 처리에 실패했습니다.",
          });
        }
      },
    );

    // 캔버스 생성 이벤트 핸들러 추가
    socket.on("createCanvas", async (data, callback) => {
      try {
        const { pageId, project, canvasData } = data;

        // 새 캔버스 트랜잭션으로 생성 작업을 수행
        const result = await createCanvas(pageId, canvasData);
        console.log("신규 캔버스");
        console.log(result);
        // 콜백으로 결과 반환
        callback(result);

        // 성공했을 경우, 프로젝트의 다른 사용자들에게 캔버스 추가 알림
        if (result.success) {
          socket.to(project).emit("canvasAdded", {
            pageId,
            canvas: result.canvas,
          });
        }
      } catch (error) {
        console.error("캔버스 생성 실패:", error);
        callback({
          success: false,
          error: "캔버스 생성에 실패했습니다.",
        });
      }
    });

    // 캔버스 순서 변경 이벤트 핸들러 추가
    socket.on(
      "reorderCanvases",
      async ({ pageId, canvasIds, project }, callback) => {
        try {
          // 캔버스 재정렬 함수 호출
          const result = await reorderCanvases(pageId, canvasIds);

          // 콜백으로 결과 반환
          callback(result);

          // 성공했을 경우, 프로젝트의 다른 사용자들에게 변경 알림
          if (result.success) {
            socket.to(project).emit("canvasesReordered", {
              pageId,
              canvases: result.canvases,
              success: true,
            });
          }
        } catch (error) {
          console.error("캔버스 순서 변경 실패:", error);
          callback({
            success: false,
            error: "캔버스 순서 변경에 실패했습니다.",
          });
        }
      },
    );

    // 캔버스 삭제 이벤트 핸들러 추가
    socket.on(
      "deleteCanvas",
      async ({ canvasId, pageId, project }, callback) => {
        try {
          // 캔버스 삭제 작업 수행
          const result = await deleteCanvas(canvasId);

          // 콜백으로 결과 반환
          callback(result);

          // 성공했을 경우, 프로젝트의 다른 사용자들에게 캔버스 삭제 알림
          if (result.success) {
            socket.to(project).emit("canvasDeleted", {
              canvasId,
              pageId,
              remainingCanvases: result.remainingCanvases,
              success: true,
            });
          }
        } catch (error) {
          console.error("캔버스 삭제 실패:", error);
          callback({
            success: false,
            error: "캔버스 삭제에 실패했습니다.",
          });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log("사용자 연결이 종료되었습니다.");
      const response = removeConnectedUser(socket.id);

      response.forEach((item) => {
        io.to(item.project).emit("updateUserList", item.information);
      });
    });
  });
};
