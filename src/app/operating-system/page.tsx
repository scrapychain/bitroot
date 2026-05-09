import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { operatingSystem } from "@/content/operating-system";

export const metadata: Metadata = {
  title: "Operating System",
  description:
    "What an OS actually does. Kernel vs user mode, syscalls, processes, threads, schedulers, virtual memory, and I/O. Built on top of the CPU and memory pages.",
};

export default function OperatingSystemPage() {
  return <TopicPage content={operatingSystem} />;
}
