import "~/styles/globals.css";

import { type Metadata } from "next";
import AuthSession from "./AuthSession";
import Main from "~/components/common/Main";
import ModalPortalProvider from "~/contexts/ModalPortalContext";

export const metadata: Metadata = {
  title: "Flamingo MVP",
  description: "협업 드로잉 솔루션",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AuthSession>
          <ModalPortalProvider>
            <Main>{children}</Main>
          </ModalPortalProvider>
        </AuthSession>
        {/* 포탈 마운트 포인트 */}
        <div id="portal-root"></div>
      </body>
    </html>
  );
}
