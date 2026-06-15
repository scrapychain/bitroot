import Link from "next/link";
import { topics } from "@/lib/nav-config";
import { XCard } from "@/components/x-card";

export default function HomePage() {
  const first = topics[0];

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="home-eyebrow">Computing from the ground up</p>
          <h1 className="home-title">
            <span className="accent-lime">Scrapy</span>
            <br />
            <span className="accent-cyan">Bytes</span>
          </h1>
          <p className="home-tagline">
            A growing field guide. Real <strong>Rust</strong> and{" "}
            <strong>C</strong> code. Three depth levels on every page: beginner,
            intermediate, advanced.
            <br />
            From electrons switching states to UTF-8 encoding the emoji in your
            text. Every topic builds on the one before it.
          </p>
        </div>
        <XCard />
      </section>

      <div className="topic-grid">
        {topics.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="home-topic-card"
            style={{ ["--card-accent" as string]: t.accent }}
          >
            <span className="home-topic-num">
              {t.num ? `${t.num} / ` : ""}
              {t.label.toUpperCase()}
            </span>
            <span className="home-topic-title">{t.label}</span>
            <p className="home-topic-desc">{t.desc}</p>
            <div className="topic-levels" aria-hidden="true">
              {Array.from({ length: t.levels }).map((_, i) => (
                <div key={i} className="lvl-pip active" />
              ))}
            </div>
            <span className="home-topic-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="stack-section">
        <p className="stack-label">The abstraction stack (reading order)</p>
        <div className="stack-layers">
          <div className="stack-layer">
            <div className="stack-layer-name">Application</div>
            <div className="stack-layer-val">Your program, strings, numbers</div>
          </div>
          <div className="stack-layer hl-cyan">
            <div className="stack-layer-name">Encoding</div>
            <div className="stack-layer-val">
              ASCII · UTF-8 · Unicode codepoints
            </div>
          </div>
          <div className="stack-layer hl-lime">
            <div className="stack-layer-name">Bit patterns</div>
            <div className="stack-layer-val">
              Binary · hex · two&apos;s complement
            </div>
          </div>
          <div className="stack-layer hl-magenta">
            <div className="stack-layer-name">Hardware</div>
            <div className="stack-layer-val">
              Transistors · logic gates · adders
            </div>
          </div>
          <div className="stack-layer">
            <div className="stack-layer-name">Physics</div>
            <div className="stack-layer-val">
              Electrons · voltage levels · CMOS
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer-cta">
        <Link
          className="start-btn"
          href={first.href}
          style={{ ["--card-accent" as string]: first.accent }}
        >
          Start with {first.label} →
        </Link>
        <span className="reading-time">
          {topics.length} topics &nbsp;·&nbsp; Beginner → Advanced each
        </span>
      </div>
    </>
  );
}
