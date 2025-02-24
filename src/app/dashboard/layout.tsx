"use client";
import Sidebar from "~/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex h-screen bg-neutral-800">
        <Sidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
