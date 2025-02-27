import AddButton from "~/components/common/button/AddButton";
import { useSetAtom, useAtomValue } from "jotai";
import { pageCanvasInformationAtom, currentPageAtom } from "~/store/atoms";
import { addPage, getYPagesMap } from "~/app/actions/yjs/pageYjs";
import { useSession } from "next-auth/react";
import { PageWithCanvases } from "~/store/atoms";

const PageHeader: React.FC = () => {
  const setSelectedPage = useSetAtom(currentPageAtom);
  const pages = useAtomValue(pageCanvasInformationAtom);
  const { data: session } = useSession();

  const handleAddPage = () => {
    if (!session || !pages.length) return;

    const newPageName = `페이지 ${pages.length + 1}`;
    const projectId = pages[0]!.project_id;

    const newPageId = addPage(newPageName, session, projectId);
    if (newPageId) {
      // 새 페이지는 YJS 관찰자를 통해 자동으로 pages 상태에 추가됨
      // 필요하면 새 페이지로 직접 이동할 수 있음
      setTimeout(() => {
        const yPagesMap = getYPagesMap();
        if (yPagesMap) {
          // Y.Map에서 값만 추출하여 배열로 변환
          const newPages = Array.from(yPagesMap.values()) as PageWithCanvases[];
          const newPage = newPages.find((p) => p.id === newPageId);
          if (newPage) {
            setSelectedPage(newPage);
          }
        }
      }, 100); // 약간의 지연으로 YJS 동기화 시간을 고려
    }
  };

  return (
    <div className="flex w-full gap-2">
      <p className="text-xs font-bold text-neutral-100">페이지</p>
      <AddButton size={18} onClick={handleAddPage} />
    </div>
  );
};

export default PageHeader;
