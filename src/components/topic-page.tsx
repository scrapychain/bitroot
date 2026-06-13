import { Hero } from "./hero";
import { LevelSection } from "./level-section";
import { NextUp } from "./next-up";
import { TopicPager } from "./topic-pager";
import { Connections } from "./connections";
import { topics } from "@/lib/nav-config";
import type { PageContent } from "@/types/content";

export async function TopicPage({ content }: { content: PageContent }) {
  // Each page has a signature accent colour (nav-config). Pass it down so the
  // in-page card grids pick it up as their left-border highlight.
  const topic = topics.find((t) => t.href === `/${content.slug}`);
  const accent = topic?.accent;

  return (
    <>
      <TopicPager slug={content.slug} />
      {content.banner && (
        <aside className="series-banner" aria-label={content.banner.eyebrow}>
          <span className="series-banner-eyebrow">{content.banner.eyebrow}</span>
          <h2 className="series-banner-title">{content.banner.title}</h2>
          <div className="series-banner-body">
            {content.banner.lines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        </aside>
      )}
      <Hero
        eyebrow={content.hero.eyebrow}
        titleHtml={content.hero.title}
        ledeHtml={content.hero.lede}
      >
        {content.hero.narrativeHtml && (
          <div className="page-narrative" dangerouslySetInnerHTML={{ __html: content.hero.narrativeHtml }} />
        )}
      </Hero>
      {content.levels.map((level) => (
        <LevelSection key={level.number} content={level} accent={accent} />
      ))}
      {content.connections && (
        <Connections label={topic?.label ?? ""} data={content.connections} />
      )}
      {content.nextUp && (
        <NextUp
          eyebrow={content.nextUp.eyebrow}
          title={content.nextUp.title}
          href={content.nextUp.href}
          label={content.nextUp.label}
          variant={content.nextUp.variant}
        />
      )}
    </>
  );
}
