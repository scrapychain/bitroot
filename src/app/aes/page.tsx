import type { Metadata } from "next";
import { TopicPage } from "@/components/topic-page";
import { aes } from "@/content/aes";

export const metadata: Metadata = {
  title: "Symmetric Encryption & AES",
  description:
    "Ten rounds of XOR with structure, unbreakable for a billion years. The AES state and key sizes, the four operations (SubBytes, ShiftRows, MixColumns, AddRoundKey), the S-box and key expansion, modes from ECB to GCM, and where AES wraps every Bitcoin secret.",
};

export default function AesPage() {
  return <TopicPage content={aes} />;
}
