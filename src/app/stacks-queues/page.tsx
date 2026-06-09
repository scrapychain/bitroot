import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { stacksQueues } from "@/content/stacks-queues";

export const metadata: Metadata = {
  title: "Stacks & Queues",
  description:
    "Two rules each, everything else follows. LIFO stacks and FIFO queues from first principles: the call stack you already use, array vs linked-list implementations, ring-buffer queues, the deque, priority queues, and the Bitcoin mempool as a binary max-heap.",
};

export default function StacksQueuesPage() {
  return <TopicPage content={stacksQueues} />;
}
