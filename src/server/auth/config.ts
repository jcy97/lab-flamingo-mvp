import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "~/schemas";

import { db } from "~/server/db";
import bcrypt from "bcryptjs";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  //인증을 어떤 서비스 제공자를 통해 처리할 지 선택
  providers: [
    //인증방식을 ID / Password 방식으로 사용
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      //인증을 검증하는 방법(함수)
      authorize: async (credentials) => {
        try {
          // zod 스키마로 입력 정보 유효성 검사
          const { email, password } =
            await signInSchema.parseAsync(credentials);
          const user = await db.user.findUnique({
            where: {
              email: email,
            },
          });
          // 비밀번호 검사
          const passwordMatch = await bcrypt.compare(
            password,
            user?.password ?? "",
          );
          // 비밀번호가 잘못되면 에러 반환
          if (!passwordMatch) {
            return null;
          }
          // 인증 성공 시 사용자 데이터 반환
          return user;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
  adapter: PrismaAdapter(db),
  callbacks: {
    async redirect({ url, baseUrl }) {
      return "/dashboard/project";
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
  },
} satisfies NextAuthConfig;
