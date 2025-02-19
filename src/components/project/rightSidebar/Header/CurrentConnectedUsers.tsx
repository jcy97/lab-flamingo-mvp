import React from "react";
import Status from "~/components/common/profile/Status";
interface Props {
  type: string;
}
const CurrentConnectedUsers: React.FC<Props> = ({ type }) => {
  return (
    <div className="mt-1 flex flex-1 flex-col overflow-auto">
      <p className="text-xs font-bold text-neutral-100">
        {type === "user" ? "접속자" : "음성 채널"}
      </p>
      <div className="relative mt-1 max-h-24">
        <div className="flex items-center justify-start gap-1 overflow-auto">
          <Status nickname="jcy" />
          <Status nickname="jcy" />
          <Status nickname="그림왕웹툰왕" />
          <Status nickname="그림왕웹툰왕" />
          <Status nickname="그림왕웹툰왕" />
          <Status nickname="그림왕웹툰왕" />
        </div>
      </div>
    </div>
  );
};

export default CurrentConnectedUsers;
