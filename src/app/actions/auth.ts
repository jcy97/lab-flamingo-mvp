"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "~/server/auth";

export const singOut = async () => {
  await signOut();
};

export const authenticate = async (
  prevState: string | undefined,
  formData: FormData,
) => {
  try {
    await signIn("credentials", formData);
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
