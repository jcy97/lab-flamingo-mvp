"use client";
import { useSession } from "next-auth/react";
import AddButton from "~/components/common/button/AddButton";
import { useAtomValue } from "jotai";
import { currentCanvasAtom } from "~/store/atoms";
import { addLayer } from "~/app/actions/yjs/layerYjs";

const LayerHeader: React.FC = () => {
  const { data: session } = useSession();
  const currentCanvas = useAtomValue(currentCanvasAtom);

  const handleAddLayer = async () => {
    if (!currentCanvas || !session) return;

    try {
      const newLayerId = await addLayer(currentCanvas.id, session);
      if (newLayerId) {
        console.log("새 레이어 생성 성공:", newLayerId);
      }
    } catch (error) {
      console.error("레이어 생성 중 오류 발생:", error);
    }
  };

  return (
    <div className="flex w-full gap-2 px-2">
      <p className="text-xs font-bold text-neutral-100">레이어</p>
      <AddButton size={18} onClick={handleAddLayer} />
    </div>
  );
};

export default LayerHeader;
