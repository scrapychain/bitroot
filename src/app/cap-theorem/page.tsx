import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { capTheorem } from "@/content/cap-theorem";

export const metadata: Metadata = {
  title: "CAP Theorem",
  description:
    "You can only guarantee two. Consistency, availability, partition tolerance: pick any two. An interactive walkthrough of the CAP theorem, what every real system chose, PACELC, consensus in C and Rust, and why Bitcoin is the most famous CP system ever built.",
};

export default function CapTheoremPage() {
  return <TopicPage content={capTheorem} />;
}
