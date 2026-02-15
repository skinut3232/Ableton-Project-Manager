import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SetCrate — Project Management for Ableton Live",
  description:
    "Organize sessions, track versions, capture ideas — and never lose work again. Built by a producer, for producers.",
  openGraph: {
    title: "SetCrate — Project Management for Ableton Live",
    description:
      "Organize sessions, track versions, capture ideas — and never lose work again.",
    type: "website",
    url: "https://setcrate.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "SetCrate — Project Management for Ableton Live",
    description:
      "Organize sessions, track versions, capture ideas — and never lose work again.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
