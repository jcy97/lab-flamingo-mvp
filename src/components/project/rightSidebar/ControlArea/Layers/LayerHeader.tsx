import AddButton from "~/components/common/button/AddButton";

const LayerHeader: React.FC = () => {
  return (
    <div className="flex w-full gap-2 px-2">
      <p className="text-xs font-bold text-neutral-100">레이어</p>
      <AddButton size={18} />
    </div>
  );
};

export default LayerHeader;
