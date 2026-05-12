import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { pointers } from "@/content/pointers";

export const metadata: Metadata = {
  title: "Pointers",
  description:
    "What a pointer is, why every dynamic data structure depends on them, and the five classic bugs they cause. Side-by-side comparison of how C lets you express the bugs and how Rust refuses to compile them.",
};

export default function PointersPage() {
  return <TopicPage content={pointers} />;
}
