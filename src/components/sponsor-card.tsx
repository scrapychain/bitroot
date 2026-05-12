import Link from "next/link";
import { currentSponsor } from "@/lib/sponsor";

export function SponsorCard() {
  const sponsor = currentSponsor;

  if (!sponsor) {
    return (
      <Link href="/pricing" className="sponsor-card sponsor-card-empty">
        <div className="sponsor-eyebrow">{"// sponsor slot"}</div>
        <div className="sponsor-name">Available</div>
        <p className="sponsor-tagline">
          One curated sponsor per month. Niche audience of systems-curious
          developers reading about bits, gates, kernels, and Rust. Built for
          tools and libraries people here actually use.
        </p>
        <div className="sponsor-cta">see pricing →</div>
      </Link>
    );
  }

  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="sponsor-card"
    >
      <div className="sponsor-eyebrow">{"// sponsor"}</div>
      <div className="sponsor-name">{sponsor.name}</div>
      <p className="sponsor-tagline">{sponsor.tagline}</p>
      <div className="sponsor-cta">{sponsor.cta ?? "Visit"} →</div>
    </a>
  );
}
