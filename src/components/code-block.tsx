import { highlight } from "@/lib/highlight";

interface CodeBlockProps {
  code: string;
  lang: "rust" | "c";
  label?: string;
}

export async function CodeBlock({ code, lang, label: labelProp }: CodeBlockProps) {
  const html = await highlight(code, lang);
  const label = labelProp ?? (lang === "rust" ? "Rust" : "C");

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
