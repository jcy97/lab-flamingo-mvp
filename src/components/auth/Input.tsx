interface Props {
  title: string;
  type: string;
  name: string;
  required: boolean;
  placeHolder: string;
  value: string; // 추가된 부분
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // 추가된 부분
}

const Input: React.FC<Props> = ({
  title,
  type,
  name,
  required,
  placeHolder,
  value, // 추가된 부분
  onChange, // 추가된 부분
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
        value={value} // 추가된 부분
        onChange={onChange} // 추가된 부분
      />
    </div>
  );
};

export default Input;
