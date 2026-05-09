import Link from "next/link";
import { cn } from "@/lib/cn";

interface NextUpProps {
  eyebrow: string;
  title: string;
  href: string;
  label: string;
  variant?: "cyan" | "magenta";
}

export function NextUp({ eyebrow, title, href, label, variant = "cyan" }: NextUpProps) {
  return (
    <div className="next-up">
      <div className="next-up-text">
        <div className="next-up-eyebrow">{eyebrow}</div>
        <div className="next-up-title">{title}</div>
      </div>
      <Link href={href} className={cn("btn", variant === "magenta" && "btn-magenta")}>
        {label} <span>→</span>
      </Link>
    </div>
  );
}
