import Canvases from "./Canvases/Canvases";
import Pages from "./Pages/Pages";

const DrawingList: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="max-h-[200px] min-h-[120px] flex-shrink-0">
        <Pages />
      </div>
      <div className="min-h-0 flex-1">
        <Canvases />
      </div>
    </div>
  );
};
export default DrawingList;
