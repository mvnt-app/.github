import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Header } from "@/components/Header";
import { Notifier } from "@/components/Notifier";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NODE",
  description: "질문 세 개로 맞는 노드만 밝히는 팝업 웹",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "NODE", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="column">
          <Header />
          {children}
        </div>
        <Notifier />
      </body>
    </html>
  );
}
