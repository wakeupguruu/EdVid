import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EdVid - AI-Powered Educational Video Generator",
  description: "Create stunning educational videos with AI-generated Manim animations. Transform any topic into engaging visual content.",
  keywords: ["education", "video generation", "AI", "Manim", "learning", "STEM"],
  authors: [{ name: "EdVid Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://edvid.io",
    title: "EdVid - AI-Powered Educational Video Generator",
    description: "Create stunning educational videos with AI-generated Manim animations",
    siteName: "EdVid",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
