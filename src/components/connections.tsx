import Link from "next/link";
import { topics } from "@/lib/nav-config";
import type { PageContent } from "@/types/content";

type ConnectionsData = NonNullable<PageContent["connections"]>;

/**
 * "Where this topic appears across ScrapyBytes" grid. Each item names a target
 * page by slug; the badge label, accent colour, and link are pulled straight
 * from nav-config so the cards stay in sync with the rest of the site.
 */
export function Connections({ label, data }: { label: string; data: ConnectionsData }) {
  const title = data.title ?? `${label} across ScrapyBytes`;
  const introHtml =
    data.introHtml ??
    `<p>The same ideas surface all over ScrapyBytes. Here is where this page connects to the rest of the curriculum, and how to follow each thread.</p>`;

  const cards = data.items
    .map((item) => {
      const topic = topics.find((t) => t.href === `/${item.slug}`);
      return topic ? { ...item, topic } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (cards.length === 0) return null;

  return (
    <section className="level connections">
      <h3>{title}</h3>
      <div className="prose" dangerouslySetInnerHTML={{ __html: introHtml }} />
      <div className="hconn">
        {cards.map(({ slug, text, topic }) => (
          <Link
            key={slug}
            href={topic.href}
            className="hconn-card"
            style={{ ["--c" as string]: topic.accent }}
          >
            <span className="hconn-badge">{topic.label}</span>
            <p className="hconn-text" dangerouslySetInnerHTML={{ __html: text }} />
            <span className="hconn-link">scrapybytes.vercel.app{topic.href} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
