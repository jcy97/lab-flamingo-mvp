import { IoLogOutOutline } from "react-icons/io5";
import { signout } from "~/app/actions/auth";

const LogoutButton = () => {
  const hanldeLogout = () => {
    signout();
  };
  return (
    <div
      className="flex w-full transform items-center justify-center gap-4 duration-300 hover:scale-105 hover:cursor-pointer"
      onClick={hanldeLogout}
    >
      <IoLogOutOutline size={20} className="text-neutral-100" />
      <p className="text-sm text-neutral-100">로그아웃</p>
    </div>
  );
};
export default LogoutButton;
