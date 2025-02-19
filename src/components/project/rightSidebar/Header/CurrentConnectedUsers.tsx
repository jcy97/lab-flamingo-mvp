import React from "react";
import Status from "~/components/common/profile/Status";

const CurrentConnectedUsers = () => {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="text-xs font-bold text-neutral-100">접속자</p>
      <div className="flex items-center justify-start gap-1">
        <Status nickname="jcy" />
        <Status nickname="jcy" />
        <Status nickname="그림왕웹툰왕" />
      </div>
    </div>
  );
};

export default CurrentConnectedUsers;
