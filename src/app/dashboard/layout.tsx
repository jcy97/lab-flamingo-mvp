import Sidebar from "~/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {modal}
      <main className="flex h-screen bg-neutral-800">
        <Sidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
