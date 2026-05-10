import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { compileVsRuntime } from "@/content/compile-vs-runtime";

export const metadata: Metadata = {
  title: "Compile vs Runtime",
  description:
    "What happens at compile time, what happens at runtime, and why the line between them is the single most useful split in programming. Connects every layer of the stack.",
};

export default function CompileVsRuntimePage() {
  return <TopicPage content={compileVsRuntime} />;
}
