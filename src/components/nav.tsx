"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { topics } from "@/lib/nav-config";

export function Nav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const onHome = pathname === "/";
  const onTopic = topics.some((t) => t.href === pathname);

  // Close drawer + dropdown on route change
  useEffect(() => {
    setDrawerOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dropdownOpen]);

  // ESC closes drawer; lock background scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-prompt" aria-hidden="true">{">"}</span>
          <span className="brand-name">
            scrapy<b>bytes</b>
          </span>
        </Link>

        <ul className="nav-links" data-open={drawerOpen}>
          <li>
            <Link href="/" className={onHome ? "active" : undefined}>
              home
            </Link>
          </li>

          <li className="nav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-dropdown-trigger${onTopic ? " active" : ""}`}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span>topics</span>
              <span className="nav-dropdown-chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            <div className="nav-dropdown-panel" data-open={dropdownOpen} role="menu">
              {topics.map((t) => {
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    role="menuitem"
                    className={active ? "active" : undefined}
                    style={{ ["--card-accent" as string]: t.accent }}
                  >
                    <span className="nav-dropdown-num">{t.num}</span>
                    <span className="nav-dropdown-label">{t.label.toLowerCase()}</span>
                  </Link>
                );
              })}
            </div>
          </li>
          <li>
            <a
              href="https://x.com/ashutoshrana_20"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-social-link"
              aria-label="Ashutosh Rana on X"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={drawerOpen}
          aria-controls="primary-nav"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span className={`nav-toggle-bar ${drawerOpen ? "is-open" : ""}`} />
          <span className={`nav-toggle-bar ${drawerOpen ? "is-open" : ""}`} />
          <span className={`nav-toggle-bar ${drawerOpen ? "is-open" : ""}`} />
        </button>
      </div>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="nav-scrim"
          onClick={() => setDrawerOpen(false)}
        />
      )}
    </nav>
  );
}
