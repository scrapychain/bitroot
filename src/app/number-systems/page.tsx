import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { numberSystems } from "@/content/number-systems";

export const metadata: Metadata = {
  title: "Number Systems",
  description:
    "Decimal, binary, octal, hexadecimal, plus the weirder ones (BCD, gray code, base 64). Why programmers move between bases, and how to read and convert between them in Rust and C.",
};

export default function NumberSystemsPage() {
  return <TopicPage content={numberSystems} />;
}
