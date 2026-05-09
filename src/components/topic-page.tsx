import { Hero } from "./hero";
import { LevelSection } from "./level-section";
import { NextUp } from "./next-up";
import type { PageContent } from "@/types/content";

export async function TopicPage({ content }: { content: PageContent }) {
  return (
    <>
      <Hero
        eyebrow={content.hero.eyebrow}
        titleHtml={content.hero.title}
        ledeHtml={content.hero.lede}
      />
      {content.levels.map((level) => (
        <LevelSection key={level.number} content={level} />
      ))}
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
