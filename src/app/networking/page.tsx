import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { networking } from "@/content/networking";

export const metadata: Metadata = {
  title: "Networking",
  description:
    "Networking from first principles. IP addresses, packets, TCP/IP, routing, sockets, HTTPS, and how every previous topic on the site shows up the moment two computers connect. Ends with the convergence into blockchain.",
};

export default function NetworkingPage() {
  return <TopicPage content={networking} />;
}
