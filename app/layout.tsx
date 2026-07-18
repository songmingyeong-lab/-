import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가리봉동 도시재생 주민체감 보조지표",
  description: "서울 공공데이터 기반 가리봉동 도시재생 주민체감 Proxy 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
