import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { variables } from "@/content/variables";

export const metadata: Metadata = {
  title: "Variables",
  description:
    "From `let x = 42` to bits in RAM. Where the OS and compiler put each variable, primitive vs dynamic data layout, alignment and padding, and how lifetime is tracked in C versus Rust.",
};

export default function VariablesPage() {
  return <TopicPage content={variables} />;
}
