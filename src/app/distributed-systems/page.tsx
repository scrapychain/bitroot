import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { distributedSystems } from "@/content/distributed-systems";

export const metadata: Metadata = {
  title: "Distributed Systems",
  description:
    "No single machine knows everything. Distributed systems from first principles: ledgers, the Byzantine Generals problem, CAP theorem, gossip protocols, consistent hashing, Byzantine fault tolerance, state machine replication, and why Bitcoin is the canonical example.",
};

export default function DistributedSystemsPage() {
  return <TopicPage content={distributedSystems} />;
}
