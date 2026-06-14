import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { publicKeyCryptography } from "@/content/public-key-cryptography";

export const metadata: Metadata = {
  title: "Public Key Cryptography",
  description:
    "One key creates it, only one key opens it. Key pairs, the padlock asymmetry, RSA versus elliptic curves, secp256k1 and scalar multiplication, ECDH, HD wallets and BIP-32, and the Bitcoin address types that put public key cryptography to work.",
};

export default function PublicKeyCryptographyPage() {
  return <TopicPage content={publicKeyCryptography} />;
}
