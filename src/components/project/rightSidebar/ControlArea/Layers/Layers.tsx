import { useSetAtom } from "jotai";
import LayerHeader from "./LayerHeader";
import LayerList from "./LayerList";
import { currentFocusAreaAtom } from "~/store/atoms";
import { FOCUS_AREA } from "~/constants/focus";

const Layers: React.FC = () => {
  const setCurrentArea = useSetAtom(currentFocusAreaAtom);
  return (
    <div
      onClick={() => setCurrentArea(FOCUS_AREA.LAYER)}
      className="flex h-full flex-col border-b border-neutral-700 bg-neutral-900"
    >
      <div className="flex-shrink-0 py-2">
        <LayerHeader />
      </div>
      <LayerList />
    </div>
  );
};
export default Layers;
