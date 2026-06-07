import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { searching } from "@/content/searching";

export const metadata: Metadata = {
  title: "Searching Algorithms",
  description:
    "Searching from first principles. Linear vs binary search, the famous overflow bug, interpolation and exponential search, searching custom types, and how Bitcoin uses hashing and sorting together. The payoff of every page before it.",
};

export default function SearchingPage() {
  return <TopicPage content={searching} />;
}
