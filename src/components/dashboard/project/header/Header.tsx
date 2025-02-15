import AddButton from "./AddButton";
import Search from "./Search";

const Header: React.FC = () => {
  return (
    <div className="mt-11 flex w-full gap-6">
      <Search />
      <AddButton />
    </div>
  );
};
export default Header;
