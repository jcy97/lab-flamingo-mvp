import PageHeader from "./PageHeader";
import PageList from "./PageList";

const Pages: React.FC = () => {
  return (
    <div className="flex h-[90%] flex-col gap-2 border-b border-neutral-700 px-3 py-2">
      <div className="flex-shrink-0">
        <PageHeader />
      </div>
      <div className="h-full">
        <PageList />
      </div>
    </div>
  );
};
export default Pages;
