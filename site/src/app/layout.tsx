import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SetCrate — Ableton Project Manager for Windows",
  description:
    "Scan your Ableton library, extract BPM and key from .als files, detect missing samples, find projects by plugin — and access everything from your phone.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "SetCrate — Ableton Project Manager for Windows",
    description:
      "Scan your Ableton library, extract BPM and key from .als files, detect missing samples, find projects by plugin — and access everything from your phone.",
    type: "website",
    url: "https://setcrate.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "SetCrate — Ableton Project Manager for Windows",
    description:
      "Scan your Ableton library, extract BPM and key from .als files, detect missing samples, find projects by plugin — and access everything from your phone.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
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
