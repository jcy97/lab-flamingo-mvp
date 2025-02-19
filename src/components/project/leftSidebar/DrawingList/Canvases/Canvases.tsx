import CanvasHeader from "./CanvasHeader";
import CanvasList from "./CanvasList";

const Canvases: React.FC = () => {
  return (
    <div className="flex h-full flex-col gap-2 border-b border-neutral-700 px-3 py-2">
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
