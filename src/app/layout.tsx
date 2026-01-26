import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: '街頭演説ナビ - 演説場所をリアルタイムで確認',
  description:
    '日本の国政選挙における街頭演説の場所をリアルタイムで地図上に可視化。政党・候補者ごとの演説スケジュールを確認できます。',
  keywords: ['街頭演説', '選挙', '政治', '候補者', '演説場所', 'リアルタイム', '地図'],
  authors: [{ name: '街頭演説ナビ' }],
  openGraph: {
    title: '街頭演説ナビ',
    description: '街頭演説の場所をリアルタイムで確認',
    type: 'website',
    locale: 'ja_JP',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
