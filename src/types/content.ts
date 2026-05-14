export type Level = "beginner" | "intermediate" | "advanced";

export interface CodeSample {
  language: "rust" | "c";
  code: string;
  filename?: string;
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
  | "fetch-execute-flow";

export type Block =
  | { kind: "prose"; html: string }
  | { kind: "heading"; text: string }
  | { kind: "codepair"; pair: CodePair }
  | { kind: "callout"; variant: "info" | "warn"; title: string; body: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "grid"; columns?: 2 | 3 | 4; cards: { label: string; value: string; desc: string }[] }
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
    | "compile-vs-runtime";
  hexLabel: string;
  category: string;
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
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
