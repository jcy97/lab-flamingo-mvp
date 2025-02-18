import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="relative flex h-screen bg-neutral-700">
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
