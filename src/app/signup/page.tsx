"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { register } from "../actions/auth";
import Input from "~/components/auth/Input";
import Button from "~/components/auth/Button";

export default function Page() {
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });

  const [errorMessage, formAction, isPending] = useActionState(
    register,
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
      <div className="animate-fade-in relative m-6 flex max-h-full min-h-[650px] min-w-[500px] max-w-full flex-col items-center rounded-2xl bg-neutral-700 shadow-2xl">
        <Link href="/signin">
          <FaArrowLeft
            size="16px"
            className="absolute left-4 top-4 text-neutral-100 transition-transform duration-300 hover:scale-125 hover:cursor-pointer"
          />
        </Link>
        <p className="mt-4 text-2xl font-bold text-neutral-100">회원가입</p>
        <form action={formAction}>
          <div className="mb-12">
            <Input
              title="이메일"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required={true}
              placeHolder="이메일을 입력하세요"
            />
            <Input
              title="닉네임"
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              required={true}
              placeHolder="닉네임을 입력하세요"
            />
            <Input
              title="비밀번호"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={true}
              placeHolder="비밀번호를 입력하세요"
            />
            <Input
              title="비밀번호 확인"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required={true}
              placeHolder="비밀번호를 다시 입력하세요"
            />
          </div>
          <Button disabled={isPending}>
            {isPending ? "인증 중" : "회원가입"}
          </Button>
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
