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
  | "distributed-truth-poster"
  | "binary-tree-traversal"
  | "degenerate-tree"
  | "btree-node"
  | "graph-types"
  | "bfs-vs-dfs"
  | "transaction-dag"
  | "lightning-route"
  | "crypto-problem"
  | "bitcoin-address-derivation"
  | "keypair-flow"
  | "elliptic-curve"
  | "address-types"
  | "signature-flow"
  | "nonce-reuse-attack"
  | "schnorr-aggregation"
  | "hash-timeline"
  | "sha256-round"
  | "hmac-nesting"
  | "symmetric-flow"
  | "aes-round"
  | "ecb-penguin";

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
  | "linked-list-visualiser"
  | "big-o-race"
  | "process-scheduler"
  | "sorting-race"
  | "hash-visualiser"
  | "search-race"
  | "tcp-handshake-sim"
  | "node-scales"
  | "stack-queue-visualiser"
  | "bst-visualiser"
  | "graph-explorer"
  | "crypto-explorer"
  | "dh-key-exchange"
  | "keypair-explorer"
  | "signature-tamper"
  | "sha256-explorer"
  | "aes-explorer";

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
    | "sorting"
    | "searching"
    | "stacks-queues"
    | "trees"
    | "graphs"
    | "cryptography"
    | "public-key-cryptography"
    | "digital-signatures"
    | "hash-deep-dive"
    | "aes";
  hexLabel: string;
  category: string;
  /**
   * Optional announcement banner rendered above the hero. Used to mark the
   * start of a new series. eyebrow is the small label, title the headline,
   * lines the body sentences (each rendered on its own row).
   */
  banner?: {
    eyebrow: string;
    title: string;
    lines: string[];
  };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    narrativeHtml?: string;
  };
  levels: [LevelContent, LevelContent, LevelContent];
  /**
   * Optional "where this topic connects across ScrapyBytes" grid, rendered
   * after the levels. Each item links to another page by slug; its badge
   * label and accent colour are derived from nav-config automatically.
   */
  connections?: {
    title?: string;
    introHtml?: string;
    items: { slug: string; text: string }[];
  };
  nextUp?: {
    eyebrow: string;
    title: string;
    href: string;
    label: string;
    variant: "cyan" | "magenta";
  };
}
