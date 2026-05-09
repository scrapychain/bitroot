import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { ascii } from "@/content/ascii";

export const metadata: Metadata = {
  title: "ASCII",
  description:
    "From bits to characters. The 7-bit ASCII table, control codes, and the leap to UTF-8.",
};

export default function AsciiPage() {
  return <TopicPage content={ascii} />;
}
