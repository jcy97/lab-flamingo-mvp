import { currentFocusAreaAtom } from "~/store/atoms";
import CanvasHeader from "./CanvasHeader";
import CanvasList from "./CanvasList";
import { useSetAtom } from "jotai";
import { FOCUS_AREA } from "~/constants/focus";

const Canvases: React.FC = () => {
  const setCurrentArea = useSetAtom(currentFocusAreaAtom);
  return (
    <div
      onClick={() => setCurrentArea(FOCUS_AREA.CANVAS)}
      className="flex h-full flex-col gap-2 border-b border-neutral-700 px-3 py-2"
    >
      <div className="flex-shrink-0">
        <CanvasHeader />
      </div>
      <div className="min-h-0 flex-1">
        <CanvasList />
      </div>
    </div>
  );
};
export default Canvases;
