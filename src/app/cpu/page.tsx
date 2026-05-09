import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { cpu } from "@/content/cpu";

export const metadata: Metadata = {
  title: "How a CPU Works",
  description:
    "How a CPU actually runs: fetch-decode-execute, registers and ALUs, pipelining, caches, and branch prediction. Built up from binary, ASCII, and logic gates.",
};

export default function CpuPage() {
  return <TopicPage content={cpu} />;
}
