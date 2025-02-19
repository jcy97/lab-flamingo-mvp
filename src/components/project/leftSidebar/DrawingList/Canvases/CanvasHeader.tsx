import AddButton from "~/components/common/button/AddButton";

const CanvasHeader: React.FC = () => {
  return (
    <div className="flex w-full gap-2">
      <p className="text-xs font-bold text-neutral-100">캔버스</p>
      <AddButton size={18} />
    </div>
  );
};

export default CanvasHeader;
