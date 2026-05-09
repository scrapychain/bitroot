import { CodeBlock } from "./code-block";
import type { CodePair as CodePairType } from "@/types/content";

export async function CodePair({ pair }: { pair: CodePairType }) {
  return (
    <div className="codepair">
      <CodeBlock code={pair.rust.code} lang="rust" />
      <CodeBlock code={pair.c.code} lang="c" />
    </div>
  );
}
