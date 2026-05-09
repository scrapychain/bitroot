import { highlight } from "@/lib/highlight";

interface CodeBlockProps {
  code: string;
  lang: "rust" | "c";
}

export async function CodeBlock({ code, lang }: CodeBlockProps) {
  const html = await highlight(code, lang);
  const label = lang === "rust" ? "Rust" : "C";

  return (
    <div className="codeblock" data-lang={lang}>
      <div className="code-head">
        <span className="lang-tag">{label}</span>
        <span className="dots">• • •</span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
