import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { trees } from "@/content/trees";

export const metadata: Metadata = {
  title: "Trees",
  description:
    "A linked list that branches. Binary trees and their three traversals, binary search trees and why balance matters, self-balancing AVL and red-black trees, and the three trees running inside every Bitcoin block: the Merkle tree, the B-tree in LevelDB, and the recursive call tree.",
};

export default function TreesPage() {
  return <TopicPage content={trees} />;
}
