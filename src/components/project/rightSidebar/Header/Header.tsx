import React, { useState } from "react";
import Connection from "./Connection";
import MeetingConnection from "./MeetingConnection";

const Header = () => {
  return (
    <div className="flex w-full flex-col border-b border-neutral-700 pb-3">
      <Connection />
      <MeetingConnection />
    </div>
  );
};

export default Header;
