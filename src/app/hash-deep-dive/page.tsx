import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { hashDeepDive } from "@/content/hash-deep-dive";

export const metadata: Metadata = {
  title: "Hash Functions Deep Dive",
  description:
    "Open the SHA-256 black box. The hash family from MD5 to SHA-3, the 64-round compression function built from ROTR, SHR, XOR, AND, NOT and modular addition, a complete from-scratch SHA-256 in Rust and C, plus HMAC, length extension attacks, password hashing, and every place Bitcoin uses SHA-256.",
};

export default function HashDeepDivePage() {
  return <TopicPage content={hashDeepDive} />;
}
