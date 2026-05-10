import Link from "next/link";
import { topics, type Topic } from "@/lib/nav-config";

interface TopicPagerProps {
  slug: string;
}

/**
 * Small horizontal pager rendered above the hero on every topic page.
 * Shows previous and next topics derived from the topics array, so it
 * stays in sync automatically as topics are added or reordered.
 */
export function TopicPager({ slug }: TopicPagerProps) {
  const slugPath = `/${slug}`;
  const idx = topics.findIndex((t) => t.href === slugPath);
  if (idx === -1) return null;

  const prev: Topic | null = idx > 0 ? topics[idx - 1] : null;
  const next: Topic | null = idx < topics.length - 1 ? topics[idx + 1] : null;

  return (
    <nav className="topic-pager" aria-label="Topic pagination">
      {prev ? (
        <Link
          href={prev.href}
          className="topic-pager-link prev"
          style={{ ["--card-accent" as string]: prev.accent }}
        >
          <span className="topic-pager-arrow" aria-hidden="true">
            ←
          </span>
          <span className="topic-pager-text">
            <span className="topic-pager-label">prev</span>
            <span className="topic-pager-title">{prev.label}</span>
          </span>
        </Link>
      ) : (
        <Link href="/" className="topic-pager-link prev">
          <span className="topic-pager-arrow" aria-hidden="true">
            ←
          </span>
          <span className="topic-pager-text">
            <span className="topic-pager-label">back</span>
            <span className="topic-pager-title">home</span>
          </span>
        </Link>
      )}

      {next ? (
        <Link
          href={next.href}
          className="topic-pager-link next"
          style={{ ["--card-accent" as string]: next.accent }}
        >
          <span className="topic-pager-text">
            <span className="topic-pager-label">next</span>
            <span className="topic-pager-title">{next.label}</span>
          </span>
          <span className="topic-pager-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      ) : (
        <span className="topic-pager-end" aria-hidden="true" />
      )}
    </nav>
  );
}
