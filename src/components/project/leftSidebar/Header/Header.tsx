import { MdOutlineDevicesFold } from "react-icons/md";
const Header: React.FC = () => {
  return (
    <div className="flex w-full flex-col justify-center gap-2 border-b border-neutral-700 px-2 py-3 text-left">
      <div className="flex w-full items-center justify-between">
        <img src="/side-logo.svg" alt="사이드 로고" />
        <MdOutlineDevicesFold
          className="transform text-neutral-100 duration-300 hover:cursor-pointer"
          size={20}
        />
      </div>
      <p className="w-full border-none bg-transparent pl-1 text-sm font-bold text-neutral-100 outline-none">
        테스트
      </p>
    </div>
  );
};
export default Header;
