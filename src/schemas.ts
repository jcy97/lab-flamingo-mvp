import { object, string } from "zod";

export const signUpSchema = object({
  email: string({ required_error: "이메일을 입력하세요" }).email(
    "유효하지 않은 이메일입니다.",
  ),
  password: string({ required_error: "비밀번호를 입력하세요" })
    .min(6, "비밀번호는 6자리 이상이어야 합니다")
    .max(32, "비밀번호는 32자리 이하여야 합니다."),
});

export const signInSchema = object({
  email: string({ required_error: "이메일을 입력하세요" }).email(
    "유효하지 않은 이메일입니다.",
  ),
  password: string({ required_error: "비밀번호를 입력하세요" }),
});
