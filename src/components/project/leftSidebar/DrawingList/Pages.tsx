import PageHeader from "./Pages/PageHeader";
import PageList from "./Pages/PageList";

const Pages: React.FC = () => {
  return (
    <div className="flex min-h-[200px] flex-col gap-2 border-b border-neutral-700 px-3 py-2">
      <PageHeader />
      <PageList />
    </div>
  );
};
export default Pages;
