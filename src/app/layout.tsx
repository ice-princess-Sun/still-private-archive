import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STILL — 私人图文空间",
  description: "一个安静、私密的图文收藏空间。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
