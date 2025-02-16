import Header from "~/components/dashboard/project/header/Header";
import Main from "~/components/dashboard/project/main/Main";

export default function Page() {
  return (
    <div className="flex h-screen w-full flex-col px-12">
      <Header />
      <Main />
    </div>
  );
}
