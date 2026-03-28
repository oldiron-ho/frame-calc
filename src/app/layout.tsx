import type { Metadata, Viewport } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "목조주택 난간 계산기",
  description:
    "전체 길이, 동일 간격 개수, 난간 두께를 입력하면 각 난간의 시작 위치를 바로 계산하는 모바일 최적화 웹 앱",
  applicationName: "FrameCalc Web",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3eadf",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
