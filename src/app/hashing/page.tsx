import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { hashing } from "@/content/hashing";

export const metadata: Metadata = {
  title: "Hashing",
  description:
    "Hashing from first principles. Hash functions, hash maps and collision handling, cryptographic hashes, Merkle trees, and the chain in blockchain. Every layer is the same trick with more paranoia.",
};

export default function HashingPage() {
  return <TopicPage content={hashing} />;
}
