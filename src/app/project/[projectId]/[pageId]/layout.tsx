import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";

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
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
