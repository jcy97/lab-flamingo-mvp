import Status from "~/components/common/profile/Status";
import CurrentConnectedUsers from "./CurrentConnectedUsers";

const Header: React.FC = () => {
  return (
    <div className="flex justify-between">
      <CurrentConnectedUsers />
    </div>
  );
};
export default Header;
