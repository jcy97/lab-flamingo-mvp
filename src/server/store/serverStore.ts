import { Project } from "@prisma/client";
import { Session } from "next-auth";

const connectedUsers = new Map();

export const addNewConnectedUser = ({
  socketId,
  user,
  project,
}: {
  socketId: string;
  user: Session;
  project: string;
}) => {
  // 프로젝트에 해당하는 정보를 가져오거나 초기화
  const projectInfo = connectedUsers.get(project) || {
    project,
    information: [],
  };

  // 새로운 사용자 정보를 추가
  projectInfo.information.push({ socketId, user });

  // 업데이트된 정보를 저장
  connectedUsers.set(project, projectInfo);
};

export const getConnectedUsers = (project: string) => {
  // 특정 프로젝트에 접속 중인 유저들의 리스트를 반환
  const projectInfo = connectedUsers.get(project);

  // 프로젝트 정보가 존재하면 information 배열 반환, 아니면 빈 배열 반환
  return projectInfo ? projectInfo.information : [];
};

interface ProjectInformation {
  project: string;
  information: { socketId: string; user: Session }[];
}
export const removeConnectedUser = (socketId: string) => {
  let response: ProjectInformation[] = [];
  // 모든 프로젝트에서 해당 socketId를 가진 유저를 제거
  connectedUsers.forEach((projectInfo, project) => {
    projectInfo.information = projectInfo.information.filter(
      (userInfo: { socketId: string; user: Session }) =>
        userInfo.socketId !== socketId,
    );

    // 만약 해당 프로젝트의 정보가 비어있으면 프로젝트 정보도 삭제
    if (projectInfo.information.length === 0) {
      connectedUsers.delete(project);
    }
    const result = connectedUsers.get(project);

    if (result) {
      response.push({ project: project, information: result.information });
    }
  });
  return response;
};
