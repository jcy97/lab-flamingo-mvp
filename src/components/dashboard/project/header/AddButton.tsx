"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import AddProjectModal from "~/components/modal/AddProjectModal";
import Modal from "~/components/modal/Modal";
const AddButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <div
        className="flex h-[60px] w-[150px] items-center justify-center gap-1 rounded-xl bg-second-500 duration-300 hover:cursor-pointer hover:bg-second-700"
        onClick={() => setIsModalOpen(true)}
      >
        <IoMdAdd size={24} className="text-neutral-100" />
        <p className="text-xl text-neutral-100">새 프로젝트</p>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <AddProjectModal level={1} onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  );
};
export default AddButton;
