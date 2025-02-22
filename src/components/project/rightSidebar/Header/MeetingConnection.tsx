import ParticipationButton from "~/components/common/button/ParticipationButton";
import CurrentConnectedUsers from "./CurrentConnectedUsers";
import { useState } from "react";

const MeetingConnection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-2">
      <button
        onClick={toggleExpand}
        className="mx-2 mt-1 flex items-center text-xs font-bold text-neutral-100 focus:outline-none"
      >
        <span>음성채널</span>
        <span className="ml-2 text-[10px] transition-transform duration-200">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-40" : "max-h-0"
        }`}
      >
        <div className="flex items-center justify-around gap-2 px-2">
          <CurrentConnectedUsers type="meeting" />
          <div className="h-full border-l border-neutral-500" />
          <div className="flex-none">
            <ParticipationButton width={60} height={35} iconSize={15} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingConnection;
