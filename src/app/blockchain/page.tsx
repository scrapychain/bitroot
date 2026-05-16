import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { blockchain } from "@/content/blockchain";

export const metadata: Metadata = {
  title: "Blockchain",
  description:
    "Intro to blockchain as the capstone of the site. From one transistor in 1947 to a financial network nobody owns: how every previous topic (binary, gates, CPU, memory, pointers, data structures, hashing, networking, nodes) stacks into Bitcoin, with nothing missing.",
};

export default function BlockchainPage() {
  return <TopicPage content={blockchain} />;
}
