import ParticipationButton from "~/components/common/button/ParticipationButton";
import CurrentConnectedUsers from "./CurrentConnectedUsers";

const MeetingConnection: React.FC = () => {
  return (
    <div className="mt-3 flex items-center justify-around gap-2 px-2">
      <CurrentConnectedUsers type="meeting" />
      <div className="h-full border-l border-neutral-500" />
      <div className="flex-none">
        <ParticipationButton width={60} height={35} iconSize={15} />
      </div>
    </div>
  );
};

export default MeetingConnection;
