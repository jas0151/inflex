import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "INFLEX — Macro, DeFi & Crypto Intelligence",
    template: "%s | INFLEX",
  },
  description:
    "Platform analisis profesional untuk Makroekonomi, DeFi, dan Crypto. Riset mendalam untuk investor dan analis.",
  keywords: [
    "makroekonomi",
    "DeFi",
    "crypto",
    "analisis",
    "bitcoin",
    "ethereum",
  ],
  authors: [{ name: "INFLEX" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "INFLEX",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-paper text-ink">{children}</body>
    </html>
  );
}
