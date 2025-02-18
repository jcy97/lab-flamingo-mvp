import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>
        <LeftSidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
