import { AiFillSound } from "react-icons/ai";
interface ParticipationButtonProps {
  width?: number;
  height?: number;
  iconSize?: number;
}
const ParticipationButton: React.FC<ParticipationButtonProps> = ({
  width = 15,
  height = 15,
  iconSize = 15,
}) => {
  const buttonStyle = {
    height: `${height}px`,
    width: `${width}px`,
  };

  return (
    <div
      style={buttonStyle}
      className="flex items-center justify-center gap-1 rounded-sm bg-primary-500 p-2 duration-300 hover:cursor-pointer hover:bg-primary-700"
    >
      {/* TODO 상태에 따라 퇴장 처리 가능해야 함 */}
      <AiFillSound
        className="text-neutral-100"
        style={{ fontSize: `${iconSize * 1.2}px` }}
      />

      <p className="text-xs text-neutral-100">참가</p>
    </div>
  );
};
export default ParticipationButton;
