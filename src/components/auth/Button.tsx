import { boolean } from "zod";

interface Props {
  disabled: boolean;
  children: React.ReactNode;
}
const Button: React.FC<Props> = ({ disabled, children }) => {
  return (
    <button className="bg bg-primary-500 hover:bg-primary-700 min-h-[55px] min-w-[350px] rounded-md text-center text-lg text-neutral-100 duration-300">
      {children}
    </button>
  );
};
export default Button;
