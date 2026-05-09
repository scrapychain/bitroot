"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/lib/nav-config";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close drawer on ESC, lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-name">
            bit<b>root</b>
          </span>
        </Link>

        <ul className="nav-links" data-open={open}>
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link href={href} className={active ? "active" : undefined}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nav-toggle-bar ${open ? "is-open" : ""}`} />
          <span className={`nav-toggle-bar ${open ? "is-open" : ""}`} />
          <span className={`nav-toggle-bar ${open ? "is-open" : ""}`} />
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="nav-scrim"
          onClick={() => setOpen(false)}
        />
      )}
    </nav>
  );
}
