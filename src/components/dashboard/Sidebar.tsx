"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MenuButton from "./MenuButton";
import menuList from "~/constants/menu";

const Sidebar = () => {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    // pathname이 비어있으면 0번 메뉴의 경로로 설정
    setActivePath(pathname || menuList[0]!.path);
  }, [pathname]);

  return (
    <aside className="flex min-w-[230px] flex-col items-center bg-neutral-800">
      <img src="/logo.png" alt="로고" className="ml-3 mt-8 w-[200px]" />
      <section className="mt-12 flex flex-col items-center space-y-5">
        {menuList.map((menu) => (
          <Link href={menu.path} key={menu.path} className="w-full">
            <MenuButton
              label={menu.label}
              isActive={activePath === menu.path}
              Icon={menu.icon}
            />
          </Link>
        ))}
      </section>
    </aside>
  );
};

export default Sidebar;
