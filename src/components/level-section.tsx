import { CodePair } from "./code-pair";
import { Callout } from "./callout";
import { TruthTable } from "./truth-table";
import { CardGrid } from "./card-grid";
import { GateGrid } from "./gate-diagram";
import { AsciiGrid } from "./ascii-grid";
import { Diagram } from "./diagrams";
import type { Block, LevelContent } from "@/types/content";

function renderTitle(html: string) {
  // turn `**word**` into <span class="accent">word</span>
  return html.replace(/\*\*([^*]+)\*\*/g, '<span class="accent">$1</span>');
}

async function RenderBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "prose":
      return <div className="prose" dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "heading":
      return <h3>{block.text}</h3>;
    case "codepair":
      return <CodePair pair={block.pair} />;
    case "callout":
      return <Callout variant={block.variant} title={block.title} body={block.body} />;
    case "table":
      return <TruthTable headers={block.headers} rows={block.rows} />;
    case "grid":
      return <CardGrid columns={block.columns} cards={block.cards} />;
    case "gates":
      return <GateGrid gates={block.gates} />;
    case "asciiGrid":
      return <AsciiGrid />;
    case "diagram":
      return <Diagram name={block.name} caption={block.caption} />;
    case "raw":
      return <div dangerouslySetInnerHTML={{ __html: block.html }} />;
  }
}

export async function LevelSection({ content }: { content: LevelContent }) {
  const levelClass = `level level-${content.level}`;
  const labelMap = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  } as const;

  return (
    <section className={levelClass}>
      <div className="level-header">
        <span className="level-tag">{labelMap[content.level]}</span>
        <span className="level-num">{`// level ${content.number}`}</span>
        <h2 dangerouslySetInnerHTML={{ __html: renderTitle(content.title) }} />
      </div>
      {content.blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </section>
  );
}
