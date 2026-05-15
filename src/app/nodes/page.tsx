import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { nodes } from "@/content/nodes";

export const metadata: Metadata = {
  title: "Nodes",
  description:
    "What 'node' means in computer science, computer networking, and blockchain. Three scales of the same essential pattern: a participant with an identity, holding state, connected to others.",
};

export default function NodesPage() {
  return <TopicPage content={nodes} />;
}
