import Link from "next/link";
import { topicLinks } from "@/lib/nav-config";

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">
            scrapy<b>bytes</b>
          </div>
          <p className="footer-tag">
            A layered field guide to the foundations of computing, built for the curious, the
            rigorous, and everyone in between.
          </p>
          <div className="footer-social">
            <a
              href="https://x.com/ashutoshrana_20"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ashutosh Rana on X"
            >
              <XIcon />
              <span>@ashutoshrana_20</span>
            </a>
          </div>
        </div>
        <div className="footer-col">
          <h4>topics</h4>
          <ul>
            {topicLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-col">
          <h4>levels</h4>
          <ul>
            <li>
              <span style={{ color: "var(--neon-lime)" }}>Beginner</span>
            </li>
            <li>
              <span style={{ color: "var(--neon-cyan)" }}>Intermediate</span>
            </li>
            <li>
              <span style={{ color: "var(--neon-magenta)" }}>Advanced</span>
            </li>
          </ul>
          <h4 style={{ marginTop: "1.4rem" }}>elsewhere</h4>
          <ul>
            <li>
              <Link href="/sponsors">Sponsorship tiers</Link>
            </li>
            <li>
              <Link href="/pricing">Sponsor details &amp; FAQ</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{"// © Ashutosh Rana 2026 · scrapybytes.vercel.app · root.system v0.1"}</span>
        <span>
          made with <span style={{ color: "var(--neon-magenta)" }}>█</span> bits
        </span>
      </div>
    </footer>
  );
}
