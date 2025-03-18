import { useAtomValue } from "jotai";
import CurrentConnectedUsers from "./CurrentConnectedUsers";
import ShareButton from "~/components/common/button/ShareButton";
import { currentConnectedUserAtom } from "~/store/atoms";
import { useState } from "react";
import Modal from "~/components/modal/Modal";
import ShareProjectModal from "~/components/modal/ShareProjectModal";

const Connection: React.FC = () => {
  const currentConnectedUsers = useAtomValue(currentConnectedUserAtom);
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <div className="mt-3 flex items-center justify-around gap-2 px-2">
        <CurrentConnectedUsers
          type="user"
          currentConnectedUsers={currentConnectedUsers}
        />
        <div className="h-full border-l border-neutral-500" />
        <div className="flex-none">
          <ShareButton
            width={60}
            height={35}
            iconSize={15}
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <ShareProjectModal level={1} onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  );
};
export default Connection;
