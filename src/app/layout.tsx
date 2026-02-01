import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "街頭演説ナビ",
  description:
    "日本の国政選挙における街頭演説の場所をリアルタイムで地図上に可視化．政党・候補者ごとの演説スケジュールを確認できます．",
  keywords: [
    "街頭演説",
    "選挙",
    "政治",
    "候補者",
    "演説場所",
    "リアルタイム",
    "地図",
  ],
  authors: [{ name: "街頭演説ナビ" }],
  openGraph: {
    title: "街頭演説ナビ",
    description:
      "日本の国政選挙における街頭演説の場所をリアルタイムで地図上に可視化．政党・候補者ごとの演説スケジュールを確認できます．",
    type: "website",
    locale: "ja_JP",
    images: ["/enzetsu-navi/ogp.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "街頭演説ナビ",
    description:
      "日本の国政選挙における街頭演説の場所をリアルタイムで地図上に可視化．政党・候補者ごとの演説スケジュールを確認できます．",
    images: ["/enzetsu-navi/ogp.png"],
  },
  icons: {
    icon: "/enzetsu-navi/favicon.svg",
  },
};

/**
 * ルートレイアウトコンポーネント．
 * アプリケーション全体の基本レイアウトとプロバイダーの設定を行う．
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
      <GoogleAnalytics gaId="G-804WWCVEPF" />
    </html>
  );
}
