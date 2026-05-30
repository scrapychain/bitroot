import {
  xHandle,
  xProfileUrl,
  xFollowUrl,
  xFeaturedThread,
} from "@/lib/social";

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function XCard() {
  return (
    <div className="x-card">
      <div className="x-card-eyebrow">
        <XIcon size={11} />
        <span>follow along</span>
      </div>

      <a
        href={xProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="x-card-handle"
      >
        @{xHandle}
      </a>

      <p className="x-card-tagline">
        Building ScrapyBytes in public. New topics drop here first, plus the
        research, the weird CS rabbit holes, and the threads that distill each
        page into 60 seconds.
      </p>

      <a
        href={xFollowUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="x-card-cta"
      >
        <XIcon size={13} />
        <span>Follow on X</span>
      </a>

      {xFeaturedThread && (
        <a
          href={xFeaturedThread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="x-card-secondary"
        >
          ↳ {xFeaturedThread.title}
        </a>
      )}
    </div>
  );
}
