import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { logicGates } from "@/content/logic-gates";

export const metadata: Metadata = {
  title: "Logic Gates & Transistors",
  description:
    "From electrons to NAND. How transistors switch, how gates compose, and how a CPU adds two numbers.",
};

export default function LogicGatesPage() {
  return <TopicPage content={logicGates} />;
}
