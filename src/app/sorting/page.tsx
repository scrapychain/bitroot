import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { sorting } from "@/content/sorting";

export const metadata: Metadata = {
  title: "Sorting Algorithms",
  description:
    "Before you can find anything you have to sort everything. Bubble sort, merge sort, quicksort, Timsort, pdqsort - the complete arc from the prototype nobody uses to what your language actually runs in production.",
};

export default function SortingPage() {
  return <TopicPage content={sorting} />;
}
