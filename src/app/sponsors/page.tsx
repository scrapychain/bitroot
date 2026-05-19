import type { Metadata } from "next";
import { sponsorContactUrl } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "Three ways to back BitRoot. Bit, Byte, and Block tiers, named after the units this site is built on. Reach systems-curious developers in the hero slot every visitor sees first.",
};

type Tier = {
  num: string;
  name: string;
  unit: string;
  price: string;
  duration: string;
  perMonth: string;
  accent: string;
  desc: string;
  features: string[];
  badge?: string;
};

const tiers: Tier[] = [
  {
    num: "01",
    name: "Bit",
    unit: "the smallest unit",
    price: "$20",
    duration: "1 month",
    perMonth: "$20 / month",
    accent: "var(--neon-lime)",
    desc: "A single bit, on or off. The entry tier, for an indie launching a side project, a creator soft-launching a course, or a maintainer dipping a toe in.",
    features: [
      "Exclusive hero card on the home page for one month",
      "One launch post on X announcing the sponsorship",
      "Live within 24 hours via Stripe checkout",
    ],
  },
  {
    num: "02",
    name: "Byte",
    unit: "8 bits, the smallest addressable chunk",
    price: "$49",
    duration: "3 months",
    perMonth: "$16 / month",
    accent: "var(--neon-cyan)",
    badge: "Most popular",
    desc: "Eight bits, the smallest addressable chunk. A quarter of sustained presence; the sweet spot for a launch arc or a season of content.",
    features: [
      "Exclusive hero card on the home page for three months",
      "Monthly X post (3 total over the term)",
      "Mention in every new topic page published during the term",
      "Save $11 vs paying month-to-month",
    ],
  },
  {
    num: "03",
    name: "Block",
    unit: "a chunk of memory, contiguous",
    price: "$89",
    duration: "6 months",
    perMonth: "$15 / month",
    accent: "var(--neon-magenta)",
    desc: "A whole block of memory, contiguous and yours. The patron tier for a brand committed to the audience for half a year.",
    features: [
      "Exclusive hero card on the home page for six months",
      "Monthly X post (6 total over the term)",
      "Mention in every new topic page published during the term",
      "Permanent founding-sponsor line in the footer",
      "Save $31 vs paying month-to-month",
    ],
  },
];

export default function SponsorsPage() {
  return (
    <>
      <section className="sponsors-hero">
        <p className="home-eyebrow">{"// sponsorship tiers"}</p>
        <h1 className="sponsors-title">
          Three ways to <span className="accent-cyan">back</span> the field guide.
        </h1>
        <p className="sponsors-lede">
          Tiers named after the units this site is built on:
          a <strong>bit</strong>, a <strong>byte</strong>, a <strong>block</strong>.
          One sponsor at a time in the hero slot every visitor sees first.
          No banners, no popups, no retargeting; one quiet card, on brand.
        </p>
      </section>

      <div className="sponsor-grid">
        {tiers.map((t) => (
          <a
            key={t.name}
            href={sponsorContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sponsor-tier-card"
            style={{ ["--card-accent" as string]: t.accent }}
          >
            <div className="sponsor-tier-head">
              <span className="sponsor-tier-num">
                {t.num} / {t.name.toUpperCase()}
              </span>
              {t.badge && (
                <span className="sponsor-tier-badge">{t.badge}</span>
              )}
            </div>
            <div className="sponsor-tier-name">{t.name}</div>
            <div className="sponsor-tier-unit">{t.unit}</div>

            <div className="sponsor-tier-price">
              <span className="sponsor-tier-amount">{t.price}</span>
              <span className="sponsor-tier-duration">{t.duration}</span>
            </div>
            <div className="sponsor-tier-permonth">{t.perMonth}</div>

            <p className="sponsor-tier-desc">{t.desc}</p>

            <ul className="sponsor-tier-features">
              {t.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <span className="sponsor-tier-arrow" aria-hidden="true">
              book this slot →
            </span>
          </a>
        ))}
      </div>

      <section className="sponsors-foot">
        <p className="sponsors-foot-note">
          Prices in USD. Launch pricing while the audience builds; locked in for
          your term even if rates change later. Pay with a card via Stripe.
        </p>
        <p className="sponsors-foot-note">
          For full sponsorship details, exclusions, and FAQ, see the {""}
          <a href="/pricing" className="sponsors-foot-link">pricing page</a>.
        </p>
      </section>

      <section className="sponsors-cta">
        <div className="sponsors-cta-text">
          <div className="sponsors-cta-eyebrow">{"// get in touch"}</div>
          <div className="sponsors-cta-title">Pitch your brand in one DM.</div>
          <p className="sponsors-cta-desc">
            Tell us who you are and what you&apos;d like to promote. We&apos;ll
            reply within 48 hours with available dates and a Stripe checkout
            link if it&apos;s a fit.
          </p>
        </div>
        <a
          href={sponsorContactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sponsors-cta-button"
        >
          DM @ashutoshrana_20 →
        </a>
      </section>
    </>
  );
}
