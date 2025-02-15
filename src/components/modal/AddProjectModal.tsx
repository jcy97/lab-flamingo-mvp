import { useState } from "react";

interface Props {
  onClose: () => void;
  level: number;
}
const AddProjectModal: React.FC<Props> = ({ onClose, level }) => {
  const [projectName, setProjectName] = useState("");

  return (
    <div className="text-neutral-100">
      <h2 className="mb-6 text-xl font-bold">새 프로젝트</h2>

      <div className="mb-6">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-[45px] w-full rounded-lg border border-neutral-500 bg-neutral-700 p-2 text-sm text-neutral-100 outline-none"
          placeholder="프로젝트 이름을 입력하세요"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg bg-neutral-700 px-4 py-2"
        >
          취소
        </button>
        <button
          onClick={() => {}}
          className="rounded-lg bg-primary-500 px-4 py-2 duration-300 hover:bg-primary-700 disabled:bg-neutral-500"
        >
          {"생성"}
        </button>
      </div>
    </div>
  );
};

export default AddProjectModal;
