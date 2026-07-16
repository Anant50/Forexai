import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForexAI Pro — Premium AI Trading Intelligence",
  description: "Live Forex analytics, historical pattern parsing, and probability predictions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full dark`}>
      <body className="bg-bg-base text-text-primary h-full overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
