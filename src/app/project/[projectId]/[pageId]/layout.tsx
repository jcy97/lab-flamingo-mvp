import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>
        <LeftSidebar />
        <RightSidebar />
        <Toolbar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
