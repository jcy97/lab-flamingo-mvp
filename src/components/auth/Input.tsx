interface Props {
  title: string;
  type: string;
  name: string;
  required: boolean;
  placeHolder: string;
}
const Input: React.FC<Props> = ({
  title,
  type,
  name,
  required,
  placeHolder,
}) => {
  return (
    <div className="mt-8 flex flex-col space-y-1">
      <p className="m-0 mb-1 p-0 text-base text-neutral-300">{title}</p>
      <input
        className="mt-8 min-h-[45px] w-full min-w-[350px] rounded-md border border-neutral-500 bg-transparent px-3 text-sm text-neutral-300 outline-none placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
        type={type}
        name={name}
        required={required}
        placeholder={placeHolder}
      />
    </div>
  );
};
export default Input;
