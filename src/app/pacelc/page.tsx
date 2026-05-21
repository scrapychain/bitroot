import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { pacelc } from "@/content/pacelc";

export const metadata: Metadata = {
  title: "PACELC",
  description:
    "CAP told you what breaks. PACELC tells you what you choose every second. The latency-vs-consistency tradeoff every distributed system makes even when the network is healthy, with an interactive request simulator, real-system PACELC labels, and the blockchain ecosystem read four letters at a time.",
};

export default function PacelcPage() {
  return <TopicPage content={pacelc} />;
}
