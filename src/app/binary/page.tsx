import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { binary } from "@/content/binary";

export const metadata: Metadata = {
  title: "Binary",
  description:
    "The binary number system, explained from first principles. Beginner, intermediate, advanced. Rust and C side-by-side.",
};

export default function BinaryPage() {
  return <TopicPage content={binary} />;
}
