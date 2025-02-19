import AddButton from "~/components/common/button/AddButton";

const PageHeader: React.FC = () => {
  return (
    <div className="flex w-full gap-2">
      <p className="text-xs font-bold text-neutral-100">페이지</p>
      <AddButton size={18} />
    </div>
  );
};

export default PageHeader;
