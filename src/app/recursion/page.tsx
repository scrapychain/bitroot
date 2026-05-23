import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { recursion } from "@/content/recursion";

export const metadata: Metadata = {
  title: "Recursion",
  description:
    "A function that calls itself, until it doesn't. The base case, the call stack, and the one missing line that turns elegant code into a stack overflow. Tail recursion, trampolining, mutual recursion, and why Bitcoin validates 800,000 blocks with a loop instead.",
};

export default function RecursionPage() {
  return <TopicPage content={recursion} />;
}
