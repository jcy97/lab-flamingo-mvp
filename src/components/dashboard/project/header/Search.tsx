import { IoIosSearch } from "react-icons/io";

const Search: React.FC = () => {
  return (
    <div className="mt-1 flex h-[50px] flex-1 items-center gap-2 rounded-xl bg-neutral-900 px-6">
      <IoIosSearch size={25} className="text-neutral-100" />
      <input
        type="text"
        placeholder="프로젝트 검색"
        className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 outline-none selection:bg-second-500"
      />
    </div>
  );
};

export default Search;
