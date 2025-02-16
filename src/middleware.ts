import { auth } from "./server/auth";

export default auth((req) => {
  const isAuthenticated = !!req.auth;

  // 로그인, 회원가입, 루트 페이지 체크
  const isLoginPage = req.nextUrl.pathname === "/signin";
  const isRegisterPage = req.nextUrl.pathname === "/register";
  const isRootPage = req.nextUrl.pathname === "/";
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");

  if (!isAuthenticated) {
    // 비인증 상태일 때:
    // 1. 회원가입 페이지는 허용
    // 2. 로그인 페이지는 그대로 유지
    // 3. 나머지 모든 페이지는 로그인 페이지로 리디렉트
    if (!isRegisterPage && !isLoginPage) {
      const newUrl = new URL("/signin", req.nextUrl.origin);
      return Response.redirect(newUrl);
    }
  } else {
    // 인증된 상태일 때:
    // 로그인, 회원가입, 루트 페이지 접근 시 대시보드로 리디렉트
    if (isLoginPage || isRegisterPage || isRootPage) {
      const newUrl = new URL("/dashboard/project", req.nextUrl.origin);
      return Response.redirect(newUrl);
    }

    // 대시보드 페이지 접근 시 항상 /dashboard/project로 리디렉트
    if (isDashboardPage && req.nextUrl.pathname === "/dashboard") {
      const newUrl = new URL("/dashboard/project", req.nextUrl.origin);
      return Response.redirect(newUrl);
    }
  }
});

// 미들웨어를 적용할 페이지 설정
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/signin", "/register", "/"],
};
