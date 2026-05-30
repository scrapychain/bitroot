# ScrapyBytes - Next.js Project Specification

> Build a layered, beautifully designed educational web app teaching the foundations of computing - binary, ASCII, and transistors/logic gates - with code examples in Rust and C shown side-by-side.

This document is the **single source of truth** for the project. Read it end-to-end before writing any code, then execute the phases in order.

---

## 1. Project goal & non-goals

**Goal.** Ship a production-quality, accessible, fast-loading static-export-ready Next.js site at `ScrapyBytes.dev` with four pages: home, `/binary`, `/ascii`, `/logic-gates`. Each topic page presents the same concept at three depths (Beginner → Intermediate → Advanced) with Rust and C code samples side-by-side.

**Non-goals (do not build).**

- No backend, no DB, no auth, no API routes.
- No CMS / MDX content pipeline. Content lives directly in TSX components.
- No i18n, no dark/light theme toggle (the site is dark-only by design).
- No comment system, no analytics integration in v1.
- No interactive runnable code playground in v1 (out of scope; can be a v2).

---

## 2. Tech stack (pin these)

- **Next.js 15** with the **App Router** (`app/` directory). Use TypeScript.
- **React 19**.
- **Tailwind CSS v4** (the new CSS-first config - no `tailwind.config.ts`; configure via `@theme` in `globals.css`).
- **shiki** for syntax highlighting at build time (via `rehype-pretty-code` is fine if it simplifies things, but plain `shiki` called in a server component is preferred - see §6).
- **Geist Mono** + **Geist Sans** + **Space Grotesk** from `next/font/google` (or `next/font/local` for Geist if needed). Three font roles: display (Space Grotesk), body (Geist Sans), mono (Geist Mono / JetBrains Mono fallback).
- **lucide-react** for any icons.
- **clsx** + **tailwind-merge** (combined as a `cn()` util).
- **No** state management library. **No** UI component library (shadcn/ui is fine if Claude Code prefers, but not required - the design is custom and shadcn buttons/cards would need restyling anyway).

Initialize with:

```bash
npx create-next-app@latest ScrapyBytes --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
```

Then upgrade React/Next/Tailwind to latest stable if the template lags.

---

## 3. File & folder structure

```
ScrapyBytes/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout: fonts, <Nav>, <Footer>, metadata
│   │   ├── page.tsx                # homepage
│   │   ├── globals.css             # Tailwind v4 @import + @theme + custom CSS vars
│   │   ├── binary/
│   │   │   └── page.tsx
│   │   ├── ascii/
│   │   │   └── page.tsx
│   │   ├── logic-gates/
│   │   │   └── page.tsx
│   │   ├── opengraph-image.tsx     # dynamic OG image (Next.js convention)
│   │   ├── icon.tsx                # dynamic favicon
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── nav.tsx                 # sticky top nav with active state
│   │   ├── footer.tsx
│   │   ├── hero.tsx                # reusable page hero (eyebrow + title + lede)
│   │   ├── level-section.tsx       # wraps Beginner/Intermediate/Advanced sections
│   │   ├── code-pair.tsx           # side-by-side Rust + C code blocks
│   │   ├── code-block.tsx          # single highlighted block (server component)
│   │   ├── callout.tsx             # info/warn callout box
│   │   ├── topic-card.tsx          # homepage topic cards
│   │   ├── ascii-grid.tsx          # interactive printable ASCII grid (client comp)
│   │   ├── binary-stream.tsx       # animated marquee on homepage
│   │   ├── gate-diagram.tsx        # SVG logic gate (AND/OR/NOT/XOR/NAND/NOR)
│   │   ├── truth-table.tsx         # styled truth table component
│   │   └── next-up.tsx             # bottom-of-page CTA to next topic
│   ├── content/
│   │   ├── binary.ts               # structured content data for binary page
│   │   ├── ascii.ts
│   │   └── logic-gates.ts
│   ├── lib/
│   │   ├── cn.ts                   # clsx + tailwind-merge helper
│   │   ├── highlight.ts            # shiki singleton + highlight() function
│   │   └── nav-config.ts           # nav links array, single source for nav + footer
│   └── types/
│       └── content.ts              # types for level sections, code samples, etc.
├── public/
│   └── (static assets if needed - keep minimal)
├── README.md
├── next.config.ts
├── tsconfig.json
└── package.json
```

**Why `src/content/*.ts` instead of MDX:** the content is structured (multiple levels, paired code blocks, truth tables, custom diagrams) and benefits from typed data more than from prose-with-JSX. Each content file exports a typed object consumed by the page component.

---

## 4. Design system

The site has an established visual identity - **terminal-meets-neon**. Implement it precisely.

### 4.1 Color tokens (define in `globals.css` via `@theme`)

```
--bg-0: #0a0a0f     /* deepest background */
--bg-1: #0f1018     /* card / panel */
--bg-2: #14151f     /* nested panel, code header */
--bg-3: #1a1c28     /* hover / scrollbar */

--line: rgba(255,255,255,0.08)
--line-strong: rgba(255,255,255,0.16)

--fg: #e8e9f0       /* primary text */
--fg-dim: #9598a8   /* secondary text */
--fg-mute: #5e6275  /* tertiary / metadata */

--neon-cyan: #00f0ff
--neon-magenta: #ff2bd6
--neon-lime: #c6ff3d
--neon-amber: #ffb627
--neon-violet: #8b5cff
```

**Level color mapping** (used as accents on the level tag, the heading accent word, and the section's left rule):

- Beginner → `--neon-lime`
- Intermediate → `--neon-cyan`
- Advanced → `--neon-magenta`

**Language color mapping** (for code block headers and language tag dots):

- Rust → `--neon-amber`
- C → `--neon-cyan`

### 4.2 Typography

- Display (titles, h1, h2, brand): **Space Grotesk**, weight 700, tight letter-spacing.
- Body (prose, paragraphs): **Geist Sans**, weight 400/500.
- Mono (code, metadata, labels, eyebrows): **Geist Mono** (or JetBrains Mono fallback).
- Use `next/font/google` for all three; expose them as CSS variables (`--font-display`, `--font-body`, `--font-mono`) and reference from Tailwind theme.

### 4.3 Background atmosphere

The body has three stacked layers:

1. A 48×48 px CSS grid of faint cyan lines (`linear-gradient`).
2. Two soft radial gradient blooms (violet top-left at ~12% opacity, magenta bottom-right at ~8%).
3. A fixed-position scanline overlay (`::before`, repeating linear-gradient with 1px alternating rgba lines at very low alpha).
4. A fixed-position SVG noise overlay (`::after`, `feTurbulence` data URL, mix-blend-mode overlay, ~4% opacity).

These are all `pointer-events: none`, `position: fixed`, and behind content (z-index 1). Main content sits at z-index 2.

### 4.4 Component styling rules

- **Nav.** Sticky top, `backdrop-filter: blur(14px) saturate(1.2)`, `bg-[rgba(10,10,15,0.72)]`, bottom border `--line`. Brand has a 10px pulsing cyan dot (CSS keyframe). Nav links are mono, lowercase, with a `> ` prefix shown only on the active link (driven by `usePathname()`).
- **Buttons.** Mono, uppercase, tight letter-spacing. Primary = solid neon-cyan on dark, hover = transparent fill with cyan glow shadow. Magenta variant for "next page" CTAs.
- **Code blocks.** Rounded `12px` corners, top accent line in the language color (gradient fade), header row with colored dot + uppercase language tag, monospace at 0.85rem. Side-by-side via CSS grid `1fr 1fr`, stacking to 1fr below 760px.
- **Cards.** Subtle border, lift on hover (`translateY(-2px)`, border brightens), no shadow.
- **Tables.** Header row uses cyan uppercase mono labels; rows separated by `--line`; subtle cyan-tinted hover on rows.
- **Selection.** `::selection { background: var(--neon-magenta); color: var(--bg-0); }`.
- **Scrollbar.** Webkit-only customization, cyan thumb on dark track.

### 4.5 Animations

Keep these - the site has them already and they're part of the identity:

- `fadeUp` - opacity 0→1 + translateY 20px→0, 0.8s ease, with stagger via `delay-1/2/3/4` utility classes on hero elements.
- `pulse` - brand dot, 2s ease-in-out infinite.
- `stream` - homepage binary marquee, 60s linear infinite, translateX 0 → -50%.
- Hover on cards/buttons should be smooth (180–250ms ease).

No JS-driven scroll animations. Keep it CSS-only for performance and SSR cleanliness.

---

## 5. Content (full text)

The static HTML version of this site already exists. Port the content faithfully - **do not rewrite the prose**. Each content file should export a typed object describing the page's structure. Below is the expected shape.

### 5.1 Type definitions (`src/types/content.ts`)

```ts
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface CodeSample {
  language: 'rust' | 'c';
  code: string;          // raw source, will be syntax-highlighted at build time
  filename?: string;     // optional, e.g. "main.rs"
}

export interface CodePair {
  rust: CodeSample;
  c: CodeSample;
}

export interface Block =
  | { kind: 'prose'; html: string }                            // pre-rendered safe HTML
  | { kind: 'heading'; text: string }                          // h3 with `// ` prefix
  | { kind: 'codepair'; pair: CodePair }
  | { kind: 'callout'; variant: 'info' | 'warn'; title: string; body: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'grid'; cards: { label: string; value: string; desc: string }[] }
  | { kind: 'gates' }                                           // logic-gates page only
  | { kind: 'asciiGrid' }                                       // ascii page only
  | { kind: 'raw'; component: 'binaryFormulaBlock' };          // escape hatch for one-offs

export interface LevelContent {
  level: Level;
  number: '01' | '02' | '03';
  title: string;          // "What is **binary**, really?" - with `**accent**` for the highlighted word
  blocks: Block[];
}

export interface PageContent {
  slug: 'binary' | 'ascii' | 'logic-gates';
  hexLabel: string;       // "0x01" / "0x02" / "0x03"
  category: string;       // "binary" / "encoding" / "silicon"
  hero: {
    eyebrow: string;
    title: string;        // supports two-line break with `\n`, accent via `**word**`
    lede: string;         // safe HTML allowed (for `<code>`, `<strong>`, `<em>`)
  };
  levels: [LevelContent, LevelContent, LevelContent];
  nextUp?: {
    eyebrow: string;
    title: string;
    href: string;
    label: string;
    variant: 'cyan' | 'magenta';
  };
}
```

### 5.2 Where to copy content from

The reference HTML files contain the exact, approved copy. Treat them as the canonical text source:

- Hero copy, lede, level titles, prose paragraphs, code samples, callouts, tables, grids, "next up" blocks - all already written. Port them verbatim into the structured `content/*.ts` files.
- Markdown-style emphasis in the original (`**bold**` for accent words) maps to the `accent` color on h2 headings.
- Inline `<code>` and `<strong>` and `<em>` in prose should be preserved as raw HTML strings in `prose` blocks.

> If running this spec without the reference HTML on hand: ask the user for it. Do not invent the prose. The voice is specific and load-bearing.

---

## 6. Syntax highlighting (shiki)

Use `shiki` directly in a server component. Build-time highlighting only - no client runtime cost.

```ts
// src/lib/highlight.ts
import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighter) {
    highlighter = createHighlighter({
      themes: ["github-dark-default"], // we'll override colors via CSS vars / custom theme
      langs: ["rust", "c"],
    });
  }
  return highlighter;
}

export async function highlight(
  code: string,
  lang: "rust" | "c",
): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang,
    theme: "github-dark-default",
    transformers: [
      // strip the default <pre class="shiki ...">; we wrap ourselves
    ],
  });
}
```

**Color theme.** Use shiki's `github-dark-default` as a base. If color tweaks are needed to match the neon palette, build a custom theme JSON with these token-color mappings:

- `keyword`, `storage` → `--neon-magenta`
- `function`, `support.function` → `--neon-cyan`
- `string` → `--neon-lime`
- `constant.numeric` → `--neon-amber`
- `comment` → `--fg-mute` (italic)
- `entity.name.type` → `--neon-violet`

Use it in `<CodeBlock>`:

```tsx
// src/components/code-block.tsx - server component
import { highlight } from "@/lib/highlight";

export async function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang: "rust" | "c";
}) {
  const html = await highlight(code, lang);
  return <div className="..." dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`<CodePair>` is a server component that renders two `<CodeBlock>`s side by side with the styled headers.

---

## 7. Routing & metadata

- `/` → home (`src/app/page.tsx`)
- `/binary` → binary page
- `/ascii` → ascii page
- `/logic-gates` → logic gates page

Each page exports `metadata`:

```ts
export const metadata: Metadata = {
  title: "Binary - ScrapyBytes",
  description:
    "The binary number system, explained from first principles. Beginner, intermediate, advanced - Rust and C side-by-side.",
};
```

Root layout (`app/layout.tsx`) sets:

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://ScrapyBytes.dev"),
  title: {
    default: "ScrapyBytes - From Electrons to Code",
    template: "%s - ScrapyBytes",
  },
  description: "A layered field guide to the foundations of computing.",
  openGraph: { type: "website", siteName: "ScrapyBytes" },
  twitter: { card: "summary_large_image" },
};
```

Generate a dynamic OG image via `app/opengraph-image.tsx` using `ImageResponse` - ScrapyBytes wordmark on dark background with a subtle grid, cyan accent.

---

## 8. Components - implementation details

### 8.1 `<Nav>` (client component because of `usePathname`)

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/nav-config";
import { cn } from "@/lib/cn";

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-[rgba(10,10,15,0.72)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-8 px-[var(--pad)] py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-[1.1rem] font-bold tracking-wider"
        >
          <span className="block h-2.5 w-2.5 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-neon-cyan shadow-[0_0_8px_var(--color-neon-cyan),0_0_18px_var(--color-neon-cyan)]" />
          <span>
            bit<b className="text-neon-cyan">root</b>
          </span>
        </Link>
        <ul className="flex gap-1 font-mono text-[0.82rem]">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "rounded px-3.5 py-2 tracking-wide transition-colors",
                    active
                      ? 'bg-neon-cyan/10 text-neon-cyan before:mr-1.5 before:content-[">"]'
                      : "text-fg-dim hover:bg-bg-2 hover:text-fg",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
```

### 8.2 `<LevelSection>`

Renders one of Beginner/Intermediate/Advanced. Takes a `LevelContent` and maps each `Block` to the right child component. Uses a `level-{name}` Tailwind variant or a parent class to drive the accent color.

### 8.3 `<CodePair>`

Server component. Receives a `CodePair`, renders two `<CodeBlock>`s in a `grid grid-cols-1 md:grid-cols-2 gap-4`. Each block gets a colored header row with the language tag (Rust = amber dot + amber text, C = cyan dot + cyan text) and the `• • •` ellipsis on the right.

### 8.4 `<GateDiagram>`

A server component that takes `type: 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR'` and renders the SVG. Reuse the SVG paths from the existing `logic-gates.html`. Each diagram renders inside a `<Gate>` card with name, expression, and a mini truth table below.

The logic-gates page should render all 4 main gates (AND, OR, NOT, XOR) on the beginner section, and reference NAND universality in the advanced section with a small NAND + NOR pair.

### 8.5 `<AsciiGrid>` (client component)

Builds the printable ASCII grid 32–126 in `useMemo`. Each cell shows the character (with HTML entity escaping for `<`, `>`, `&`, and showing `␣` for space). On hover, the cell border lights cyan. Clicking a cell shows a small popover with decimal/hex/binary forms. Keep popover lightweight - pure CSS or React state, no library.

### 8.6 `<BinaryStream>`

The animated marquee on the homepage. Pure CSS animation. The track must contain the same content twice end-to-end so the loop is seamless when translating from 0 to -50%.

### 8.7 `<TruthTable>`

Takes `headers: string[]` and `rows: (string | 0 | 1)[][]`. Renders a styled table. Cells with values `0` or `1` get muted/lime coloring respectively for visual rhythm.

### 8.8 `<Callout>`

Two variants: `info` (cyan left rule, cyan title) and `warn` (amber left rule, amber title). Title is rendered as a small mono uppercase label like `// takeaway`. Body accepts safe HTML.

### 8.9 `<NextUp>`

The bottom-of-page CTA. Shows eyebrow ("next up / 0x02"), title, and a button linking to the next topic. Border-left in `--neon-magenta`.

---

## 9. Tailwind v4 setup (`globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-bg-0: #0a0a0f;
  --color-bg-1: #0f1018;
  --color-bg-2: #14151f;
  --color-bg-3: #1a1c28;

  --color-line: rgba(255, 255, 255, 0.08);
  --color-line-strong: rgba(255, 255, 255, 0.16);

  --color-fg: #e8e9f0;
  --color-fg-dim: #9598a8;
  --color-fg-mute: #5e6275;

  --color-neon-cyan: #00f0ff;
  --color-neon-magenta: #ff2bd6;
  --color-neon-lime: #c6ff3d;
  --color-neon-amber: #ffb627;
  --color-neon-violet: #8b5cff;

  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Geist Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;

  --radius-lg: 12px;
}

/* body atmosphere, scanlines, noise - port from existing styles.css */
/* keyframes: pulse, stream, fadeUp */
/* selection, scrollbar */
```

The legacy `styles.css` already contains correct, working CSS for atmosphere, animations, and selection. Port those rules into `globals.css` after the `@theme` block, replacing legacy CSS variable names with the Tailwind v4 `--color-*` equivalents where needed. Custom utilities like `.fade-up` and `.delay-1/2/3/4` should be defined as plain CSS classes in `globals.css`, not as Tailwind variants - they're simple enough.

---

## 10. Phased build plan

Execute in order. Don't skip ahead - each phase ends in a working, viewable site.

### Phase 0 - Scaffold (15 min)

1. `npx create-next-app@latest ScrapyBytes --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint`
2. Install deps: `npm i clsx tailwind-merge lucide-react shiki`
3. Replace `globals.css` with the ScrapyBytes version (from §9).
4. Add `next/font` setup in `layout.tsx` exposing the three font variables.
5. Verify `npm run dev` shows a blank dark page with the right background atmosphere.

### Phase 1 - Layout chrome (30 min)

1. Build `<Nav>` and `<Footer>` components.
2. Wire them into `app/layout.tsx`.
3. Create stub pages for `/binary`, `/ascii`, `/logic-gates`, each with just an `<h1>`.
4. Verify navigation works and active state highlights correctly.

### Phase 2 - Homepage (45 min)

1. Build `<Hero>`, `<TopicCard>`, `<BinaryStream>`, `<NextUp>`.
2. Implement `app/page.tsx` matching the existing `index.html` layout exactly.
3. Verify visual fidelity against the reference HTML (atmosphere, fade-up animations, marquee).

### Phase 3 - Content infrastructure (45 min)

1. Define types in `src/types/content.ts`.
2. Implement `<CodeBlock>`, `<CodePair>`, `<LevelSection>`, `<Callout>`, `<TruthTable>`, `<Card>` (reused for grid cards).
3. Set up shiki highlighter in `src/lib/highlight.ts`.
4. Build a tiny test page that renders a `LevelContent` to verify all block types render correctly.

### Phase 4 - Topic pages (90 min)

1. Port `binary.html` content into `src/content/binary.ts` as a typed `PageContent`.
2. Implement `app/binary/page.tsx` that consumes the content and renders it through `<Hero>` + `<LevelSection>` × 3 + `<NextUp>`.
3. Repeat for `ascii.html` → `src/content/ascii.ts` → `app/ascii/page.tsx`.
4. Repeat for `logic-gates.html` → `src/content/logic-gates.ts` → `app/logic-gates/page.tsx`.
5. Build the page-specific components: `<AsciiGrid>` (used only on ascii page) and `<GateDiagram>` (used only on logic-gates page).

### Phase 5 - Polish (30 min)

1. Implement `app/opengraph-image.tsx` using `ImageResponse`.
2. Implement `app/icon.tsx` for the favicon (a small cyan square or the brand dot).
3. Add `app/not-found.tsx` styled to match the site.
4. Tab through every page with keyboard - verify focus rings are visible and routing works without JS.
5. Run Lighthouse - target 95+ on Performance, 100 on Accessibility, SEO, Best Practices.
6. Run `npm run build` and verify it ships clean (no warnings about hydration, missing keys, or font issues).

### Phase 6 - Deploy

1. Push to a GitHub repo.
2. Import to Vercel. Default settings work.
3. Set `metadataBase` to the deployed URL.

---

## 11. Quality bar

- **Accessibility.** Semantic HTML (`<nav>`, `<main>`, `<footer>`, `<section>`, proper heading hierarchy starting at `<h1>` per page). All interactive elements keyboard-reachable. Color contrast passes WCAG AA on body text (the neon colors on body backgrounds are bright enough; verify the dim grays).
- **Performance.** No unnecessary client components. The only `'use client'` files should be `<Nav>` (uses `usePathname`) and `<AsciiGrid>` (interactive popover). Everything else server-side.
- **Type safety.** No `any`. Strict TS. The `Block` discriminated union should drive exhaustive switch in `<LevelSection>`.
- **No layout shift.** Fonts loaded with `display: 'swap'` and a sensible fallback. Reserve aspect ratios for SVG diagrams.
- **Mobile.** Test at 375px width. The code-pair stacks. The nav stays usable (consider a smaller logo + dropdown or a horizontal scroll if links overflow - but with only 4 links, they should fit).

---

## 12. What to do if blocked

- **Missing prose:** ask the user for the reference HTML files (`index.html`, `binary.html`, `ascii.html`, `logic-gates.html`, `styles.css`). Do not invent content. The voice and pacing are specific and have been authored deliberately.
- **Unclear visual detail:** prefer the reference HTML's behavior. It's the design source of truth.
- **Tailwind v4 ambiguity:** if v4 syntax causes friction, fall back to v3 (`tailwind.config.ts`) - but only as a last resort, and call it out in the PR.
- **Tradeoff between fidelity and idioms:** lean fidelity. The design has been tuned; don't drift toward generic Next.js templates.

---

## 13. Definition of done

- [ ] All four pages render at parity with the reference HTML, both visually and in content.
- [ ] Nav active state works on every page.
- [ ] Code samples are syntax-highlighted at build time (no client-side highlighter shipped).
- [ ] `npm run build` succeeds with zero warnings.
- [ ] Lighthouse: Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100.
- [ ] OG image renders.
- [ ] Site works with JavaScript disabled (except the ASCII grid popover).
- [ ] README.md explains how to dev, build, and deploy.

## 14. Footer

- [ ] Add footer : © Ashutosh Rana 2026
