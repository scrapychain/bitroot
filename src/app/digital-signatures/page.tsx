import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { digitalSignatures } from "@/content/digital-signatures";

export const metadata: Metadata = {
  title: "Digital Signatures",
  description:
    "Two signatures and one reused nonce cost Sony and Bitcoin users their private keys. What a signature proves, how ECDSA signs and verifies, why the nonce k must never repeat, RFC 6979 deterministic nonces, Schnorr signatures and MuSig aggregation, and the signature on every Bitcoin transaction.",
};

export default function DigitalSignaturesPage() {
  return <TopicPage content={digitalSignatures} />;
}
