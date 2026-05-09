import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { memory } from "@/content/memory";

export const metadata: Metadata = {
  title: "Memory",
  description:
    "What memory actually is. RAM vs ROM, stack vs heap, virtual memory, and how programming languages manage allocation. Built on binary, ASCII, logic gates, and the CPU.",
};

export default function MemoryPage() {
  return <TopicPage content={memory} />;
}
