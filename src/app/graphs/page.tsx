import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { graphs } from "@/content/graphs";

export const metadata: Metadata = {
  title: "Graphs",
  description:
    "Everything is connected, not everything is a tree. Nodes and edges, the four graph types, BFS, DFS and Dijkstra, topological sort, and the three graphs running inside Bitcoin: the peer network, the transaction DAG, and the Lightning Network.",
};

export default function GraphsPage() {
  return <TopicPage content={graphs} />;
}
