import Link from "next/link";
import { cn } from "@/lib/cn";

interface Card {
  label: string;
  value: string;
  desc: string;
  href?: string;
}

interface CardGridProps {
  columns?: 2 | 3 | 4;
  cards: Card[];
}

export function CardGrid({ columns = 3, cards }: CardGridProps) {
  return (
    <div className={cn("grid", `grid-${columns}`)}>
      {cards.map((c, i) =>
        c.href ? (
          <Link
            key={i}
            href={c.href}
            className="card is-link"
          >
            <div className="card-label">{c.label}</div>
            <div className="card-value">{c.value}</div>
            <div className="card-desc">{c.desc}</div>
            <span className="card-link-arrow" aria-hidden="true">
              read →
            </span>
          </Link>
        ) : (
          <div key={i} className="card">
            <div className="card-label">{c.label}</div>
            <div className="card-value">{c.value}</div>
            <div className="card-desc">{c.desc}</div>
          </div>
        ),
      )}
    </div>
  );
}
