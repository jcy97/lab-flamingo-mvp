import { object, string, number, date, z } from "zod";
import { Project as PrismaProject } from "@prisma/client";

export const signUpSchema = object({
  email: string({ required_error: "이메일을 입력하세요" }).email(
    "유효하지 않은 이메일입니다.",
  ),
  password: string({ required_error: "비밀번호를 입력하세요" })
    .min(6, "비밀번호는 6자리 이상이어야 합니다")
    .max(32, "비밀번호는 32자리 이하여야 합니다."),
  confirmPassword: string({ required_error: "비밀번호를 입력하세요" })
    .min(6, "비밀번호는 6자리 이상이어야 합니다")
    .max(32, "비밀번호는 32자리 이하여야 합니다."),
  nickname: string({ required_error: "닉네임을 입력하세요" })
    .min(3, "닉네임은 3자리 이상이어야 합니다.")
    .max(20, "닉네임은 20자리 이하여야 합니다."),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "패스워드가 일치하지 않습니다",
});

export const signInSchema = object({
  email: string({ required_error: "이메일을 입력하세요" }).email(
    "유효하지 않은 이메일입니다.",
  ),
  password: string({ required_error: "비밀번호를 입력하세요" }),
});

export const projectSchema = object({
  uuid: string(),
  name: string().min(3, "프로젝트명은 3자리 이상이어야 합니다"),
  created_at: date(),
  created_user_id: string(),
  updated_at: date(),
  updated_user_id: string(),
});

export type Project = z.infer<typeof projectSchema>;
