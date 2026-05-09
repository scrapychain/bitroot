import type { Metadata } from "next";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-var",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const body = Geist({
  subsets: ["latin"],
  variable: "--font-body-var",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bitroot.dev"),
  title: {
    default: "BitRoot · From Electrons to Code",
    template: "%s · BitRoot",
  },
  description: "A layered field guide to the foundations of computing.",
  openGraph: {
    type: "website",
    siteName: "BitRoot",
    title: "BitRoot · From Electrons to Code",
    description: "A layered field guide to the foundations of computing.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
