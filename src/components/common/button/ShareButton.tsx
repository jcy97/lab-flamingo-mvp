import { GiShare } from "react-icons/gi";

interface ShareButtonProps {
  width?: number;
  height?: number;
  iconSize?: number;
  onClick?: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  width = 15,
  height = 15,
  iconSize = 15,
  onClick,
}) => {
  const buttonStyle = {
    height: `${height}px`,
    width: `${width}px`,
  };

  return (
    <div
      style={buttonStyle}
      className="flex items-center justify-center gap-1 rounded-sm bg-second-500 p-2 duration-300 hover:cursor-pointer hover:bg-second-700"
      onClick={onClick}
    >
      <GiShare
        className="text-neutral-100"
        style={{ fontSize: `${iconSize * 1.2}px` }}
      />
      <p className="text-xs text-neutral-100">공유</p>
    </div>
  );
};

export default ShareButton;
