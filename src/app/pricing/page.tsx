import type { Metadata } from "next";
import { sponsorContactUrl } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "Sponsor BitRoot",
  description:
    "Reach the people who want to understand how computers actually work. Sponsorship slots, pricing, and what we will and won't run.",
};

type Tier = {
  name: string;
  total: string;
  duration: string;
  perMonth: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

const tiers: Tier[] = [
  {
    name: "Solo",
    total: "$20",
    duration: "1 month",
    perMonth: "$20 / mo",
    features: [
      "Exclusive hero card on the home page for one month",
      "One launch post on X announcing the sponsorship",
      "One-click Stripe checkout, live within 24 hours",
    ],
  },
  {
    name: "Quarter",
    total: "$49",
    duration: "3 months",
    perMonth: "$16 / mo",
    highlight: true,
    badge: "Most popular",
    features: [
      "Exclusive hero card for three months",
      "Monthly post on X (3 total)",
      "Mention in any new topic page published during the term",
      "Save $11 vs paying month-to-month",
    ],
  },
  {
    name: "Patron",
    total: "$89",
    duration: "6 months",
    perMonth: "$15 / mo",
    features: [
      "Exclusive hero card for six months",
      "Monthly post on X (6 total)",
      "Mention in any new topic page published during the term",
      "Permanent “founding sponsor” line in the footer",
      "Save $31 vs paying month-to-month",
    ],
  },
];

const audience = [
  {
    label: "who reads",
    value: "Systems-curious devs",
    desc: "Backend, infra, embedded, security, and game developers learning how the layers underneath their code actually work.",
  },
  {
    label: "what they like",
    value: "Rust + C + depth",
    desc: "Three levels per page — beginner, intermediate, advanced. Every topic includes Rust and C side-by-side.",
  },
  {
    label: "what we ship",
    value: "One topic at a time",
    desc: "Carefully written long-form. No clickbait, no listicles, no AI slop. New topics drop every few weeks.",
  },
];

const exclusions = [
  "Crypto airdrops, NFT projects, or pump-and-dump schemes",
  "AI tools whose pitch is “replace your engineers”",
  "Recruiting funnels for sweatshop dev shops",
  "Anything that misleads, harms, or insults the audience",
  "Direct competitors to a confirmed sponsor during their term",
];

const faqs = [
  {
    q: "Do you run multiple sponsors at once?",
    a: "No. The hero slot is exclusive for the term. One sponsor at a time.",
  },
  {
    q: "Can I see the audience numbers?",
    a: "Yes. DM and we'll share monthly visitors, top referrers, and country / role mix. We won't ship numbers publicly until they're worth bragging about, but we'll share them with serious sponsors before you commit.",
  },
  {
    q: "What does the card look like?",
    a: "It sits on the right half of the home page hero, above the fold. Your name as a title, your tagline below it, and a CTA link. Same dark aesthetic as the rest of the site. The whole card is one click to your URL.",
  },
  {
    q: "How does payment work?",
    a: "One-click Stripe checkout. The card goes live within 24 hours. No invoicing, no contracts, no minimum commitment beyond the chosen term.",
  },
  {
    q: "Who's this priced for?",
    a: "Indie devs launching a side project, small open-source maintainers, course creators, newsletter writers, hosting / cloud trials, dev tools with a free tier. Starting at $20 keeps the bar low enough for a single developer to sponsor with their own credit card.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="pricing-hero">
        <p className="home-eyebrow">// sponsorship</p>
        <h1 className="pricing-title">
          Reach people who want to <span className="accent-cyan">understand</span> how
          <br />
          computers <span className="accent-lime">actually work</span>.
        </h1>
        <p className="pricing-lede">
          BitRoot is a long-form field guide to the foundations of computing. One
          rotating sponsor at a time, in the hero slot every visitor sees first.
          No banners, no popups, no retargeting. One quiet card, on brand.
        </p>
      </section>

      <section className="pricing-section">
        <p className="pricing-section-label">// the audience</p>
        <div className="pricing-audience-grid">
          {audience.map((a) => (
            <div key={a.label} className="pricing-audience-card">
              <div className="pricing-audience-eyebrow">{a.label}</div>
              <div className="pricing-audience-value">{a.value}</div>
              <p className="pricing-audience-desc">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-section">
        <p className="pricing-section-label">// pricing</p>
        <div className="pricing-tiers">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`pricing-tier${t.highlight ? " is-highlight" : ""}`}
            >
              {t.badge && <div className="pricing-tier-badge">{t.badge}</div>}
              <div className="pricing-tier-name">{t.name}</div>
              <div className="pricing-tier-total">
                {t.total}
                <span className="pricing-tier-duration">{t.duration}</span>
              </div>
              <div className="pricing-tier-permonth">{t.perMonth}</div>
              <ul className="pricing-tier-features">
                {t.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                href={sponsorContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pricing-tier-cta"
              >
                book this slot →
              </a>
            </div>
          ))}
        </div>
        <p className="pricing-note">
          Prices in USD. Launch pricing while the audience builds; locked in for
          the duration of your term even if rates change later. Pay with a card
          via Stripe.
        </p>
      </section>

      <section className="pricing-section">
        <p className="pricing-section-label">// what we won&apos;t run</p>
        <ul className="pricing-exclusions">
          {exclusions.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="pricing-prose">
          The audience trusts the page because the content stays honest. Anything
          that puts that trust at risk gets turned down, no matter the rate.
        </p>
      </section>

      <section className="pricing-section">
        <p className="pricing-section-label">// faq</p>
        <div className="pricing-faq">
          {faqs.map((f) => (
            <div key={f.q} className="pricing-faq-item">
              <div className="pricing-faq-q">{f.q}</div>
              <p className="pricing-faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-cta">
        <div className="pricing-cta-text">
          <div className="pricing-cta-eyebrow">// get in touch</div>
          <div className="pricing-cta-title">Pitch your brand in one DM.</div>
          <p className="pricing-cta-desc">
            Tell us who you are and what you&apos;d like to promote. We&apos;ll
            reply within 48 hours with available dates and a Stripe checkout
            link if it&apos;s a fit.
          </p>
        </div>
        <a
          href={sponsorContactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pricing-cta-button"
        >
          DM @ashutoshrana_20 →
        </a>
      </section>
    </>
  );
}
