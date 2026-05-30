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
  metadataBase: new URL("https://scrapybytes.dev"),
  title: {
    default: "ScrapyBytes",
    template: "%s | ScrapyBytes",
  },
  description:
    "Learn computing from bits to blockchain. Binary, ASCII, logic gates - taught from first principles.",
  openGraph: {
    type: "website",
    siteName: "ScrapyBytes",
    title: "ScrapyBytes",
    description:
      "Learn computing from bits to blockchain. Binary, ASCII, logic gates - taught from first principles.",
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
