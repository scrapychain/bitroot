# ScrapyBytes — Claude Code Master Prompt
> Rebrand BitRoot → ScrapyBytes + Philosophy Page
> Execute each phase in order. One phase = one Claude Code session. Do not skip ahead.

---

## BEFORE YOU START — READ THESE RULES

```
EXECUTION RULES:
- One task per prompt. Never combine phases.
- Do not read files you are not explicitly told to touch.
- Do not reformat, restructure, or refactor anything outside the task scope.
- Do not add comments unless asked.
- After each phase, stop and wait for confirmation.
- If blocked, report the exact file and line. Do not guess or invent a fix.
```

---

## PHASE 0 — DISCOVERY (Run First. Zero Edits.)

```
Run this command and show output only:

grep -r "BitRoot\|bitroot\|bit-root\|bitroot\.dev" . \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" \
  --include="*.css" -l

Then run:

find . -name "*bitroot*" -o -name "*BitRoot*" \
  | grep -v node_modules | grep -v .git

Show both outputs. Make zero edits.
```

---

## PHASE 1 — REBRAND: FILE BY FILE

Run each block as a separate prompt. Wait for confirmation between each.

---

### 1A — package.json

```
In package.json only:
- "name": change value to "scrapybytes"
- Add "description": "ScrapyBytes — CS fundamentals from bits to blockchain"
No other files. No other changes.
```

---

### 1B — src/lib/nav-config.ts

```
In src/lib/nav-config.ts only:
- Replace any string "BitRoot" → "ScrapyBytes"
- Replace any string "bitroot" → "scrapybytes"
No other files.
```

---

### 1C — src/app/layout.tsx

```
In src/app/layout.tsx only:
- metadataBase: change URL to "https://scrapybytes.dev"
- metadata.title: change to "ScrapyBytes"
- If a title template exists (e.g. "%s | BitRoot"): change to "%s | ScrapyBytes"
- metadata.description: change to 
  "Learn computing from bits to blockchain. 
   Binary, ASCII, logic gates — taught from first principles."
- Replace all remaining "BitRoot" → "ScrapyBytes"
- Replace all remaining "bitroot" → "scrapybytes"
No other files.
```

---

### 1D — src/app/opengraph-image.tsx

```
In src/app/opengraph-image.tsx only:
- Replace "BitRoot" → "ScrapyBytes"
- Replace "bitroot.dev" → "scrapybytes.dev"
No other files.
```

---

### 1E — src/app/not-found.tsx

```
In src/app/not-found.tsx only:
- Replace "BitRoot" → "ScrapyBytes"
- Replace "bitroot" → "scrapybytes"
No other files.
```

---

### 1F — src/components/footer.tsx

```
In src/components/footer.tsx only:
- Replace "BitRoot" → "ScrapyBytes"
- Replace "bitroot" → "scrapybytes"
- Confirm "© Ashutosh Rana 2026" is present. Add if missing.
No other files.
```

---

### 1G — README.md

```
In README.md only:
- Replace all "BitRoot" → "ScrapyBytes"
- Replace all "bitroot" → "scrapybytes"
- Replace "bitroot.dev" → "scrapybytes.dev"
- In the scaffold command, change the "bitroot" argument → "scrapybytes"
No reformatting. Text replacements only.
```

---

### 1H — Rename Spec File

```
Rename spec.md → SCRAPYBYTES_SPEC.md

In SCRAPYBYTES_SPEC.md make these changes only:
- Line 1 heading: "BitRoot — Next.js Project Specification"
  → "ScrapyBytes — Next.js Project Specification"
- Replace "bitroot.dev" → "scrapybytes.dev"
- In Phase 0 scaffold command, change "bitroot" argument → "scrapybytes"

No other changes to the spec file.
```

---

### 1I — Verify Clean

```
Run this and show output only:

grep -r "BitRoot\|bitroot\|bitroot\.dev" . \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" \
  --include="*.css" \
  --exclude-dir=node_modules \
  --exclude-dir=.git

Zero results = clean. If results appear, report them. Do not auto-fix.
```

---

## PHASE 2 — PHILOSOPHY PAGE

Run each block as a separate prompt. Wait for confirmation between each.

---

### 2A — Add to Nav

```
In src/lib/nav-config.ts only:
Add one entry to the nav links array:
{ label: "philosophy", href: "/philosophy" }
Match the exact shape and style of existing nav link objects.
No other changes.
```

---

### 2B — Scaffold Page

```
Create src/app/philosophy/page.tsx.
Export a default React component: PhilosophyPage.
Return a single <main id="philosophy">.
No content. No styling. No extra imports.
```

---

### 2C — Write Content

```
In src/app/philosophy/page.tsx only.
Populate <main> with the copy below.
Use the structure exactly. Do not rewrite, summarise, or improve it.
This copy was written by a human. Preserve the voice precisely.

COPY START:
---

<h1>Why Scrapy?</h1>

<p>I didn't name it after a framework.</p>

<p>I named it after a feeling. That feeling when you're building
something with whatever you have — no perfect setup, no senior
engineer to ask. Just you, a terminal, and a problem you refuse
to walk away from.</p>

<p>That's what scrappy means to me.</p>

<h2>The Scrappy Mindset</h2>

<p>Most tutorials teach you to use things.
ScrapyBytes tries to teach you what things are.</p>

<p>There's a difference between knowing how to call an API and
understanding that at the bottom of everything — your browser,
your phone, this very webpage — there are transistors switching
between two states. On and off. One and zero.</p>

<p>I spent years writing code without knowing any of that.
And honestly? It showed.</p>

<h2>Byte by Byte</h2>

<p>"Byte by byte" isn't just a tagline. It's a pace.</p>

<p>I tried every shortcut — the 10-hour YouTube courses, the
bootcamp cheatsheets, the copy-paste mentality. And I kept
hitting the same wall. The one that appears when something
breaks and you have no idea why.</p>

<p>Because you skipped the foundation.</p>

<p>ScrapyBytes is my attempt to fix that. Not just for me.</p>

<h2>The Ecosystem</h2>

<p>ScrapyBytes doesn't exist alone.</p>

<p>It's the education layer of something bigger I've been quietly
building. ScrapyChain handles the blockchain infrastructure.
ScrapyBytes teaches you what runs beneath it. Eventually,
there's a world built on top.</p>

<p>Each piece was built scrappy. From scratch. With intention.</p>

<h2>The Anchor</h2>

<p>Chanakya said: know the root before you study the tree.</p>

<p>I think about that every time someone asks why I'm learning
how transistors work when I could just learn React. Because
React doesn't matter if you don't understand why it exists.
The tree doesn't matter without the root.</p>

<p>Every transistor is a decision.</p>
<p>Every bit is a choice.</p>
<p>Every byte you understand is ground you'll never lose.</p>

<footer>
  <p>Every bit was a choice.</p>
</footer>

---
COPY END

No classes. No styling. No imports beyond React.
```

---

### 2D — Apply Styling

```
In src/app/philosophy/page.tsx apply Tailwind classes only.
Use tokens from globals.css. No new colors. No new fonts.

Apply exactly:

<main>:
  max-w-2xl mx-auto px-6 py-20

<h1>:
  font-display text-4xl font-bold text-neon-cyan mb-8 leading-tight

<h2>:
  font-mono text-xs font-semibold text-neon-lime uppercase
  tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3

<p>:
  font-body text-fg-dim leading-relaxed mb-4

Last three <p> tags (the stanza):
  font-mono text-fg text-sm mb-2

<footer> inside <main>:
  mt-20 pt-8 border-t border-line

<footer> <p>:
  font-mono text-neon-amber text-sm italic text-center

No layout changes. No new components. Classes only.
```

---

### 2E — Metadata

```
In src/app/philosophy/page.tsx add this export
above the component function:

export const metadata = {
  title: "Philosophy | ScrapyBytes",
  description: "Why Scrapy? The mindset and mission behind
  ScrapyBytes — CS education from bits to blockchain.",
}

No other changes.
```

---

### 2F — Peer Review Pass

```
Read src/app/philosophy/page.tsx content nodes only.
Check for:

1. Any phrase that sounds AI-generated
   (flag with line reference + suggest a human alternative)
2. Any sentence starting with "Furthermore", "Moreover",
   "In conclusion", "It is important to", "In today's world"
3. Any three grammatically parallel bullets or sentences in a row
4. Any tone shift — content should sound like a builder's
   personal note, not a product landing page

Do not rewrite anything.
Report issues as a numbered list. If none found, say "Voice clean."
```

---

## PHASE 3 — BUILD CHECK

```
Run: npm run build
Show errors and warnings only.
Do not auto-fix. Report each issue with file name and line number.
```

---

## PHASE 4 — COMMIT

After build is clean, run:

```bash
git add .
git commit -m "rebrand: BitRoot → ScrapyBytes + add /philosophy page"
```

---

## MASTER CHECKLIST

```
PHASE 0
[ ] Discovery grep ran, files identified

PHASE 1 — REBRAND
[ ] 1A  package.json
[ ] 1B  nav-config.ts
[ ] 1C  layout.tsx
[ ] 1D  opengraph-image.tsx
[ ] 1E  not-found.tsx
[ ] 1F  footer.tsx
[ ] 1G  README.md
[ ] 1H  spec.md renamed → SCRAPYBYTES_SPEC.md
[ ] 1I  Verify grep = zero results

PHASE 2 — PHILOSOPHY PAGE
[ ] 2A  Nav link added
[ ] 2B  Page scaffolded
[ ] 2C  Content written
[ ] 2D  Styling applied
[ ] 2E  Metadata added
[ ] 2F  Peer review passed

PHASE 3
[ ] npm run build = clean

PHASE 4
[ ] Git commit
```
