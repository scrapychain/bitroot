import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { cryptography } from "@/content/cryptography";

export const metadata: Metadata = {
  title: "Intro to Cryptography",
  description:
    "Series 2 begins. Two strangers, no shared secret, private communication anyway. Symmetric and public key cryptography, hash functions, digital signatures, Diffie-Hellman key exchange, secp256k1 and ECDSA, and how every Bitcoin transaction proves ownership without revealing the private key.",
};

export default function CryptographyPage() {
  return <TopicPage content={cryptography} />;
}
