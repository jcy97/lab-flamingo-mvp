"use client";
import React, { useState } from "react";
import { useActionState } from "react";
import Input from "~/components/auth/Input";
import { authenticate } from "../actions/auth";
import Button from "~/components/auth/Button";
import Link from "next/link";

export default function Page() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div className="flex min-h-screen select-none items-center justify-center bg-neutral-800">
      <div className="relative m-6 flex max-h-full min-h-[550px] min-w-[500px] max-w-full animate-fade-in flex-col items-center rounded-2xl bg-neutral-700 shadow-2xl">
        <img src="/logo.png" alt="로고" className="mt-3 w-[350px]" />
        <form action={formAction}>
          <div className="mb-8">
            <Input
              title="이메일"
              type="email"
              name="email"
              required={true}
              placeHolder="이메일을 입력하세요"
              value={formData.email}
              onChange={handleChange}
            />
            <Input
              title="비밀번호"
              type="password"
              name="password"
              required={true}
              placeHolder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <Button disabled={isPending}>
            {isPending ? "인증 중" : "로그인"}
          </Button>
          <div className="text-sx my-8 flex items-center justify-center">
            <span className="text-neutral-100">
              플라밍고가 처음이신가요?{" "}
              <Link
                className="ml-1 font-bold text-second-500 hover:cursor-pointer"
                href="/signup"
              >
                회원가입
              </Link>
            </span>
          </div>
          {errorMessage && (
            <p className="mt-4 text-center text-sm text-red-500">
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
