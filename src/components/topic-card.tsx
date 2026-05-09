import Link from "next/link";

interface TopicCardProps {
  href: string;
  num: string;
  title: string;
  /** description HTML; supports <code> etc. */
  descHtml: string;
  accent: "cyan" | "magenta" | "lime" | "amber" | "violet";
}

const accentMap: Record<TopicCardProps["accent"], string> = {
  cyan: "var(--neon-cyan)",
  magenta: "var(--neon-magenta)",
  lime: "var(--neon-lime)",
  amber: "var(--neon-amber)",
  violet: "var(--neon-violet)",
};

export function TopicCard({ href, num, title, descHtml, accent }: TopicCardProps) {
  return (
    <Link
      href={href}
      className="topic-card"
      style={{ ["--accent" as string]: accentMap[accent] }}
    >
      <div className="topic-num">{num}</div>
      <div className="topic-title">{title}</div>
      <div className="topic-desc" dangerouslySetInnerHTML={{ __html: descHtml }} />
      <div className="topic-arrow">
        enter <span>→</span>
      </div>
    </Link>
  );
}
