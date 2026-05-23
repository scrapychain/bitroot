import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { bigO } from "@/content/big-o";

export const metadata: Metadata = {
  title: "Big O Notation",
  description:
    "Same answer, 317 years apart. Big O is not about speed, it is about how code scales. The complexity classes, the rules, the Big O of every data structure on the site, amortised analysis, space complexity, and how the gap between O(1) and O(2^256) is Bitcoin's entire security model.",
};

export default function BigOPage() {
  return <TopicPage content={bigO} />;
}
