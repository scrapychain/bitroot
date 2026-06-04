export type Level = "beginner" | "intermediate" | "advanced";

export interface CodeSample {
  language: "rust" | "c";
  code: string;
  filename?: string;
  label?: string;
}

export interface CodePair {
  rust: CodeSample;
  c: CodeSample;
}

export type DiagramName =
  | "pointer-to-value"
  | "array-memory"
  | "stack-vs-heap-array"
  | "array-vs-linked-list"
  | "row-vs-column-major"
  | "address-space"
  | "primitive-vs-dynamic"
  | "struct-padding"
  | "kernel-boundary"
  | "fetch-execute-flow"
  | "singly-linked-list"
  | "doubly-linked-list"
  | "linked-list-insert"
  | "linked-list-delete"
  | "hash-function"
  | "hash-table-basic"
  | "hash-collision-chain"
  | "merkle-tree"
  | "block-chain"
  | "packet-structure"
  | "network-of-networks"
  | "packet-reassembly"
  | "tcp-handshake"
  | "bitcoin-gossip"
  | "node-three-meanings"
  | "data-structure-nodes"
  | "blockchain-node-types"
  | "computing-stack-ladder"
  | "bitcoin-block-detail"
  | "mining-nonce-search"
  | "distributed-truth-poster";

export type WidgetName =
  | "gossip-network"
  | "cap-triangle"
  | "network-partition"
  | "base-converter"
  | "bit-toggle"
  | "char-explorer"
  | "text-encoder"
  | "gate-simulator"
  | "cap-visualiser"
  | "fetch-decode-execute"
  | "pacelc-simulator"
  | "blockchain-simulator"
  | "call-stack-visualiser"
  | "memory-explorer"
  | "memory-layout"
  | "pointer-visualiser"
  | "phase-classifier"
  | "array-explorer"
  | "big-o-race"
  | "process-scheduler"
  | "sorting-race";

export type Block =
  | { kind: "prose"; html: string }
  | { kind: "heading"; text: string }
  | { kind: "codepair"; pair: CodePair }
  | { kind: "callout"; variant: "info" | "warn"; title: string; body: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | {
      kind: "grid";
      columns?: 2 | 3 | 4;
      cards: { label: string; value: string; desc: string; href?: string }[];
    }
  | { kind: "widget"; name: WidgetName }
  | { kind: "gates"; gates: Array<"AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR"> }
  | { kind: "asciiGrid" }
  | { kind: "diagram"; name: DiagramName; caption?: string }
  | { kind: "raw"; html: string };

export interface LevelContent {
  level: Level;
  number: "01" | "02" | "03";
  title: string;
  blocks: Block[];
}

export interface PageContent {
  slug:
    | "number-systems"
    | "binary"
    | "ascii"
    | "logic-gates"
    | "cpu"
    | "memory"
    | "operating-system"
    | "variables"
    | "pointers"
    | "arrays"
    | "linked-list"
    | "hashing"
    | "nodes"
    | "networking"
    | "compile-vs-runtime"
    | "distributed-systems"
    | "cap-theorem"
    | "pacelc"
    | "blockchain"
    | "recursion"
    | "big-o"
    | "sorting";
  hexLabel: string;
  category: string;
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    narrativeHtml?: string;
  };
  levels: [LevelContent, LevelContent, LevelContent];
  nextUp?: {
    eyebrow: string;
    title: string;
    href: string;
    label: string;
    variant: "cyan" | "magenta";
  };
}
