import { cn } from "@/lib/cn";

interface CalloutProps {
  variant?: "info" | "warn";
  title: string;
  /** Body HTML; supports <code>, <strong>, <ol>, etc. */
  body: string;
}

export function Callout({ variant = "info", title, body }: CalloutProps) {
  return (
    <div className={cn("callout", variant === "warn" && "warn")}>
      <div className="callout-title">{title}</div>
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}
