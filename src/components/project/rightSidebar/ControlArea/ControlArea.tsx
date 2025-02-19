import Layers from "./Layers/Layers";
import Properties from "./Properties/Properties";

const ControlArea: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="h-[60%]">
        <Properties />
      </div>
      <div className="h-[40%] max-h-[450px] overflow-hidden">
        <Layers />
      </div>
    </div>
  );
};

export default ControlArea;
