import { useAtomValue } from "jotai";
import CurrentConnectedUsers from "./CurrentConnectedUsers";
import ShareButton from "~/components/common/button/ShareButton";
import { currentConnectedUserAtom } from "~/store/atoms";

const Connection: React.FC = () => {
  const currentConnectedUsers = useAtomValue(currentConnectedUserAtom);

  return (
    <div className="mt-3 flex items-center justify-around gap-2 px-2">
      <CurrentConnectedUsers
        type="user"
        currentConnectedUsers={currentConnectedUsers}
      />
      <div className="h-full border-l border-neutral-500" />
      <div className="flex-none">
        <ShareButton width={60} height={35} iconSize={15} />
      </div>
    </div>
  );
};
export default Connection;
