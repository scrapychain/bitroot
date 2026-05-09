import Link from "next/link";
import { topicLinks } from "@/lib/nav-config";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">
            bit<b>root</b>
          </div>
          <p className="footer-tag">
            A layered field guide to the foundations of computing, built for the curious, the
            rigorous, and everyone in between.
          </p>
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
        </div>
      </div>
      <div className="footer-bottom">
        <span>{"// © Ashutosh Rana 2026 · bitroot.dev · root.system v0.1"}</span>
        <span>
          made with <span style={{ color: "var(--neon-magenta)" }}>█</span> bits
        </span>
      </div>
    </footer>
  );
}
