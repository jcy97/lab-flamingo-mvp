"use client";
import dynamic from "next/dynamic";

const Canvas = dynamic(() => import("~/components/project/canvas/Canvas"), {
  ssr: false,
});

const Page = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center overflow-hidden">
      <Canvas />
    </div>
  );
};
export default Page;
