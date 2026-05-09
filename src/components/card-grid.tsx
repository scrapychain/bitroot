import { cn } from "@/lib/cn";

interface CardGridProps {
  columns?: 2 | 3 | 4;
  cards: { label: string; value: string; desc: string }[];
}

export function CardGrid({ columns = 3, cards }: CardGridProps) {
  return (
    <div className={cn("grid", `grid-${columns}`)}>
      {cards.map((c, i) => (
        <div key={i} className="card">
          <div className="card-label">{c.label}</div>
          <div className="card-value">{c.value}</div>
          <div className="card-desc">{c.desc}</div>
        </div>
      ))}
    </div>
  );
}
