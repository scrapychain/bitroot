interface HeroProps {
  eyebrow: string;
  /** Title HTML; supports <br>, <span class="highlight">, etc. */
  titleHtml: string;
  ledeHtml: string;
  children?: React.ReactNode;
}

export function Hero({ eyebrow, titleHtml, ledeHtml, children }: HeroProps) {
  return (
    <section className="hero">
      <div className="eyebrow fade-up">{eyebrow}</div>
      <h1 className="title fade-up delay-1" dangerouslySetInnerHTML={{ __html: titleHtml }} />
      <p className="lede fade-up delay-2" dangerouslySetInnerHTML={{ __html: ledeHtml }} />
      {children}
    </section>
  );
}
