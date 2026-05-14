import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { arrays } from "@/content/arrays";

export const metadata: Metadata = {
  title: "Arrays",
  description:
    "Arrays from first principles. Contiguous memory, O(1) indexing, pointer arithmetic, cache locality, and how Rust and C handle bounds. The data structure underneath every other data structure.",
};

export default function ArraysPage() {
  return <TopicPage content={arrays} />;
}
