import { useAtomValue } from "jotai";
import React from "react";
import Status from "~/components/common/profile/Status";
import { CurrentConnectedUser } from "~/types/types";

interface CurrentConnectedUsersProps {
  currentConnectedUsers: Array<CurrentConnectedUser> | undefined; // undefined 가능성 추가
  type: string;
}

const CurrentConnectedUsers: React.FC<CurrentConnectedUsersProps> = ({
  currentConnectedUsers,
  type,
}) => {
  return (
    <div className="mt-1 flex flex-1 flex-col overflow-auto">
      <p className="text-xs font-bold text-neutral-100">
        {type === "user" ? "접속자" : ""}
      </p>
      <div className="relative mt-1 max-h-24">
        <div className="flex items-center justify-start gap-1 overflow-auto">
          {currentConnectedUsers && currentConnectedUsers.length > 0 ? (
            currentConnectedUsers.map((user, index) => (
              <Status key={index} nickname={user.user.user.name!} />
            ))
          ) : (
            <p className="text-xs text-neutral-400"></p> // TODO 접속자 없을 때
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentConnectedUsers;
