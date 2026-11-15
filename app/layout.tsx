import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threads｜情境式查證 Demo",
  description: "社群交易情境的防詐使用者測試",
  icons: { icon: "/thread-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
