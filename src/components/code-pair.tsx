import { CodeBlock } from "./code-block";
import type { CodePair as CodePairType } from "@/types/content";

export async function CodePair({ pair }: { pair: CodePairType }) {
  return (
    <div className="codepair">
      <CodeBlock code={pair.rust.code} lang="rust" label={pair.rust.label} />
      <CodeBlock code={pair.c.code} lang="c" label={pair.c.label} />
    </div>
  );
}
