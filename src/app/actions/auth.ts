"use server";
import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signUpSchema } from "~/schemas";
import { signIn, signOut } from "~/server/auth";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export const signout = async () => {
  await signOut();
};

export const authenticate = async (
  prevState: string | undefined,
  formData: FormData,
) => {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "인증에 실패하였습니다.";
        default:
          return "처리 중 에러가 발생했습니다.";
      }
    }
    throw error;
  }
};

//회원가입 액션
export const register = async (
  prevState: string | undefined,
  formData: FormData,
) => {
  try {
    const { email, nickname, password, confirmPassword } =
      await signUpSchema.parseAsync({
        email: formData.get("email"),
        nickname: formData.get("nickname"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
      });

    const user = await db.user.findUnique({
      where: {
        email: email,
      },
    });
    if (user) {
      return "이미 사용 중인 이메일 주소입니다.";
    }
    const hash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        email: email,
        name: nickname,
        password: hash,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      if (error.errors.length > 0) {
        return error.errors[0]!.message;
      }
    }
  }
  redirect("/signin");
};
