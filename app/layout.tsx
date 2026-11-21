import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "這是詐騙嗎？｜網購防詐查證工具",
  description:
    "在模擬 Threads 交易情境中，透過連結查證、帳號查證、對話評估與 AI 快速對話，辨識網購詐騙線索並取得查證與通報建議。",
  icons: { icon: "/thread-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
