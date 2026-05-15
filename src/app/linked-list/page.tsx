import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { linkedList } from "@/content/linked-list";

export const metadata: Metadata = {
  title: "Linked List",
  description:
    "Linked lists from first principles. Singly and doubly linked nodes, O(1) splices, the cache cost, intrusive lists in OS kernels, and when Vec is the better answer.",
};

export default function LinkedListPage() {
  return <TopicPage content={linkedList} />;
}
