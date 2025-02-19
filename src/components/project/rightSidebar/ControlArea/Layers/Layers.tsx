import LayerHeader from "./LayerHeader";
import LayerList from "./LayerList";

const Layers: React.FC = () => {
  return (
    <div className="flex h-full flex-col border-b border-neutral-700 bg-neutral-900">
      <div className="flex-shrink-0 py-2">
        <LayerHeader />
      </div>
      <LayerList />
    </div>
  );
};
export default Layers;
