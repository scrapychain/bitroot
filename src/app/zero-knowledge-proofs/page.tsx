import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { zeroKnowledgeProofs } from "@/content/zero-knowledge-proofs";

export const metadata: Metadata = {
  title: "Zero Knowledge Proofs",
  description:
    "Prove you know a secret without revealing the secret. The Ali Baba cave, completeness, soundness and zero knowledge, the Fiat-Shamir heuristic, Pedersen commitments, zk-SNARKs and zk-STARKs, and the ZK rollups scaling blockchains a thousandfold. The finale of Series 2: Cryptography.",
};

export default function ZeroKnowledgeProofsPage() {
  return <TopicPage content={zeroKnowledgeProofs} />;
}
