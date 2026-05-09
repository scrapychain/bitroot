# BitRoot

A layered field guide to the foundations of computing — binary, ASCII, transistors and logic gates — with code examples in Rust and C side-by-side.

Built with Next.js 15, React 19, Tailwind CSS v4, and shiki.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm run start
```

## Deploy

Push to GitHub, import to Vercel — defaults work.

## Structure

- `src/app/` — App Router pages (home, `/binary`, `/ascii`, `/logic-gates`)
- `src/components/` — UI primitives (Nav, CodeBlock, GateDiagram, etc.)
- `src/content/` — typed page content (no MDX)
- `src/lib/highlight.ts` — shiki singleton, build-time syntax highlighting
- `src/app/globals.css` — Tailwind v4 `@theme` + design system

© Ashutosh Rana 2026
