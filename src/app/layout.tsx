import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PS-212 Sistem Anti Gempa | Deteksi Gempa Real-time Indonesia",
  description: "PS-212 Sistem Anti Gempa - Sistem deteksi gempa real-time berbasis web dengan peta satelit, pencarian zona aman berbasis AI, dan peringatan dini. Data dari BMKG & USGS.",
  keywords: ["PS-212", "gempa", "earthquake", "BMKG", "USGS", "zona aman", "tsunami", "mitigasi bencana", "peta satelit", "Indonesia"],
  authors: [{ name: "PS-212 Sistem Anti Gempa" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PS-212 Sistem Anti Gempa",
    description: "Deteksi gempa terbaru, peta satelit, dan zona aman berbasis AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
