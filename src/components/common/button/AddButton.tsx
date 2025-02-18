import { IoIosAdd } from "react-icons/io";

interface AddButtonProps {
  size?: number;
}

const AddButton: React.FC<AddButtonProps> = ({ size = 15 }) => {
  const buttonStyle = {
    height: `${size}px`,
    width: `${size}px`,
  };

  return (
    <div
      style={buttonStyle}
      className="flex items-center justify-center rounded-sm bg-second-500 duration-300 hover:cursor-pointer hover:bg-second-700"
    >
      <IoIosAdd
        className="text-neutral-100"
        style={{ fontSize: `${size * 1.2}px` }}
      />
    </div>
  );
};

export default AddButton;
