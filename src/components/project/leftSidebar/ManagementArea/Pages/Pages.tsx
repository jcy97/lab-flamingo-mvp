import { useSetAtom } from "jotai";
import PageHeader from "./PageHeader";
import PageList from "./PageList";
import { currentFocusAreaAtom } from "~/store/atoms";
import { FOCUS_AREA } from "~/constants/focus";

const Pages: React.FC = () => {
  const setCurrentArea = useSetAtom(currentFocusAreaAtom);

  return (
    <div
      onClick={() => setCurrentArea(FOCUS_AREA.PAGE)}
      className="flex h-[90%] flex-col gap-2 border-b border-neutral-700 px-3 py-2"
    >
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
