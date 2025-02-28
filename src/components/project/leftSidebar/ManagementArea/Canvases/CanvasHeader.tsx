import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAtom } from "jotai";
import { addCanvas } from "~/app/actions/yjs/canvasYjs";
import AddButton from "~/components/common/button/AddButton";
import { currentPageAtom } from "~/store/atoms";
import CanvasSizePopup from "./CanvasSizePopup";

const CanvasHeader: React.FC = () => {
  const { data: session } = useSession();
  const [currentPage] = useAtom(currentPageAtom);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleAddButtonClick = () => {
    if (!session || !currentPage) return;
    // 팝업 열기
    setIsPopupOpen(true);
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
  };

  const handleCreateCanvas = async (width: number, height: number) => {
    if (!session || !currentPage) return;

    try {
      // 수정된 addCanvas 함수 호출 (width, height 파라미터 추가)
      const newCanvasId = await addCanvas(
        currentPage.id,
        session,
        width,
        height,
      );
      console.log("새 캔버스가 추가되었습니다:", newCanvasId);
    } catch (error) {
      console.error("캔버스 추가 중 오류 발생:", error);
    }
  };

  return (
    <div className="flex w-full gap-2">
      <p className="text-xs font-bold text-neutral-100">캔버스</p>
      <AddButton size={18} onClick={handleAddButtonClick} />
      <CanvasSizePopup
        isOpen={isPopupOpen}
        onClose={handlePopupClose}
        onConfirm={handleCreateCanvas}
      />
    </div>
  );
};

export default CanvasHeader;
