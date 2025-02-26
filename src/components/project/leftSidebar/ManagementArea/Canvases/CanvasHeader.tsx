import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAtom } from "jotai";
import { addCanvas } from "~/app/actions/canvasYjs";
import AddButton from "~/components/common/button/AddButton";
import { currentPageAtom } from "~/store/atoms";

const CanvasHeader: React.FC = () => {
  const { data: session } = useSession();
  const [currentPage] = useAtom(currentPageAtom);

  const handleAddCanvas = () => {
    if (!session || !currentPage) return;

    // addCanvas 함수 호출
    try {
      const newCanvasId = addCanvas(currentPage.id, session);
      console.log("새 캔버스가 추가되었습니다:", newCanvasId);
    } catch (error) {
      console.error("캔버스 추가 중 오류 발생:", error);
    }
  };

  return (
    <div className="flex w-full gap-2">
      <p className="text-xs font-bold text-neutral-100">캔버스</p>
      <AddButton size={18} onClick={handleAddCanvas} />
    </div>
  );
};

export default CanvasHeader;
