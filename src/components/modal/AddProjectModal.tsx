import { useSetAtom } from "jotai";
import { useState } from "react";
import { createProject } from "~/app/actions/project";
import { projectsAtom } from "~/store/atoms";

interface Props {
  onClose: () => void;
  level: number;
}

const AddProjectModal: React.FC<Props> = ({ onClose, level }) => {
  const [projectName, setProjectName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // 에러 상태 추가
  const setProject = useSetAtom(projectsAtom);

  const handleSubmit = async () => {
    setIsPending(true);
    setErrorMessage("");

    const project = await createProject(projectName);
    setIsPending(false);

    if (typeof project === "string") {
      setErrorMessage(project);
    } else if (project) {
      setProject((prev) => [...prev, project]);
      onClose();
    }
  };

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

      {errorMessage && <div className="mb-4 text-red-500">{errorMessage}</div>}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg bg-neutral-700 px-4 py-2"
          disabled={isPending}
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-primary-500 px-4 py-2 duration-300 hover:bg-primary-700 disabled:bg-neutral-500"
          disabled={isPending}
        >
          {"생성"}
        </button>
      </div>
    </div>
  );
};

export default AddProjectModal;
