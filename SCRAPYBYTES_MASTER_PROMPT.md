# ScrapyBytes — Claude Code Master Prompt
> Token-efficient micro prompts. One task per session. No skipping ahead.

---

## HOW TO USE THIS DOCUMENT

Each block below is a single Claude Code prompt. Copy it exactly. Paste it. Wait for output. Confirm before the next block. Never combine two blocks into one message.

**Why micro prompts?**
- Claude Code charges per token in + token out. Broad instructions ("rebrand everything") force the model to read the whole codebase and produce long plans. Narrow instructions read one file, write one file, stop.
- One file per prompt = predictable cost, reviewable output, easy rollback.

---

## PHASE 0 — DISCOVERY

Paste this once. Read the output. Do not proceed until you have reviewed it.

```
Run these two commands and show output only. Make zero edits.

grep -r "BitRoot\|bitroot\|bitroot\.dev" . \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" \
  --include="*.css" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.next \
  -l

find . -name "*bitroot*" -o -name "*BitRoot*" \
  | grep -v node_modules | grep -v .git | grep -v .next

Show both outputs. Stop.
```

---

## PHASE 1 — REBRAND: FILE BY FILE

### 1A — package.json

```
In package.json only, make these two changes:
1. "name": "bitroot"  ->  "name": "scrapybytes"
2. Add after the name line: "description": "ScrapyBytes - CS fundamentals from bits to blockchain"

No other files. No formatting changes. Stop.
```

---

### 1B — src/app/layout.tsx

```
In src/app/layout.tsx only, make these exact replacements:
- metadataBase URL: "https://bitroot.dev"  ->  "https://scrapybytes.dev"
- title default: whatever it currently is  ->  "ScrapyBytes"
- title template: whatever it currently is  ->  "%s | ScrapyBytes"
- openGraph siteName: "BitRoot"  ->  "ScrapyBytes"
- openGraph title: whatever it currently is  ->  "ScrapyBytes"
- description (metadata + openGraph): replace with:
  "Learn computing from bits to blockchain. Binary, ASCII, logic gates - taught from first principles."
- Any remaining string "BitRoot"  ->  "ScrapyBytes"
- Any remaining string "bitroot"  ->  "scrapybytes"

No other files. Stop.
```

---

### 1C — src/app/opengraph-image.tsx

```
In src/app/opengraph-image.tsx only:
- Replace "BitRoot" -> "ScrapyBytes"
- Replace "bitroot" -> "scrapybytes"
- Replace "bitroot.dev" -> "scrapybytes.dev"

No other files. Stop.
```

---

### 1D — src/components/footer.tsx

```
In src/components/footer.tsx only:
- Replace "BitRoot" -> "ScrapyBytes"
- Replace "bitroot" -> "scrapybytes"
- Replace "bitroot.dev" -> "scrapybytes.dev"
- Confirm the copyright line reads: © Ashutosh Rana 2026
  If missing or different, set it to exactly that.

No other files. Stop.
```

---

### 1E — src/app/pricing/page.tsx

```
In src/app/pricing/page.tsx only:
- Replace "BitRoot" -> "ScrapyBytes"
- Replace "bitroot" -> "scrapybytes"

No other files. Stop.
```

---

### 1F — src/app/sponsors/page.tsx

```
In src/app/sponsors/page.tsx only:
- Replace "BitRoot" -> "ScrapyBytes"
- Replace "bitroot" -> "scrapybytes"

No other files. Stop.
```

---

### 1G — src/components/x-card.tsx

```
In src/components/x-card.tsx only:
- Replace "BitRoot" -> "ScrapyBytes"
- Replace "bitroot" -> "scrapybytes"

No other files. Stop.
```

---

### 1H — src/components/distributed-widgets.tsx

```
In src/components/distributed-widgets.tsx only:
- Find the TEXT_PRESETS array (or equivalent constant holding display strings).
- Replace the string "BitRoot" with "ScrapyBytes" inside that array.

No other files. Stop.
```

---

### 1I — src/content/ heading strings (all at once)

These files all contain section headings like "Where X appears in BitRoot".
Replace only those heading strings, nothing else.

```
In these files only — make the exact string replacement described:
  src/content/ascii.ts
  src/content/big-o.ts
  src/content/binary.ts
  src/content/cap-theorem.ts
  src/content/cpu.ts
  src/content/logic-gates.ts
  src/content/memory.ts
  src/content/number-systems.ts
  src/content/operating-system.ts
  src/content/pacelc.ts
  src/content/recursion.ts
  src/content/sorting.ts

For each file:
- Replace every occurrence of "in BitRoot" -> "in ScrapyBytes"
- Replace every occurrence of "across BitRoot" -> "across ScrapyBytes"
- Replace every occurrence of "touches BitRoot" -> "touches ScrapyBytes"
- Replace "bitroot.dev" -> "scrapybytes.dev" (appears in ascii.ts)

Touch no other content. No reformatting. Stop.
```

---

### 1J — README.md

```
In README.md only:
- Replace all "BitRoot" -> "ScrapyBytes"
- Replace all "bitroot" -> "scrapybytes"
- Replace "bitroot.dev" -> "scrapybytes.dev"

No reformatting. Text replacements only. Stop.
```

---

### 1K — Rename and update spec

```
1. Rename spec.md to SCRAPYBYTES_SPEC.md
2. In SCRAPYBYTES_SPEC.md only, make these replacements:
   - "BitRoot" -> "ScrapyBytes"
   - "bitroot.dev" -> "scrapybytes.dev"
   - Any scaffold command argument "bitroot" -> "scrapybytes"
No other content changes. Stop.
```

---

### 1L — Verify clean

```
Run this and show full output. Make zero edits.

grep -r "BitRoot\|bitroot\|bitroot\.dev" . \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" \
  --include="*.css" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.next

If results appear, list them. Do not auto-fix. Stop.
```

Expected noise (ignore these):
- `package-lock.json` — regenerates on npm install
- `SCRAPYBYTES_CLAUDE_CODE_PROMPT.md` / `SCRAPYBYTES_MASTER_PROMPT.md` — these are the prompt docs themselves

Any result outside those two files is a real miss. Report it.

---

## PHASE 2 — PHILOSOPHY PAGE

### 2A — Add nav entry

```
In src/lib/nav-config.ts only.
Add one entry to the topics array, at the end, matching the exact shape of existing entries:
{
  href: "/philosophy",
  label: "Philosophy",
  num: "23",
  accent: "var(--neon-amber)",
  desc: "Why Scrapy. The mindset behind learning computing from the root up.",
  levels: 3,
}

No other changes. Stop.
```

---

### 2B — Scaffold page shell

```
Create src/app/philosophy/page.tsx.
Contents: a default export named PhilosophyPage returning a single empty <main id="philosophy">.
No imports beyond what Next.js needs. No content. No styling. Stop.
```

---

### 2C — Write content

```
In src/app/philosophy/page.tsx only.
Replace the empty <main> with the JSX below.
Do not rewrite, summarise, improve, or restructure the copy.
The voice is the author's. Preserve it exactly — punctuation, fragments, all of it.

---

<main id="philosophy">
  <h1>Why Scrapy?</h1>

  <p>I didn't name it after a framework.</p>

  <p>
    I named it after a feeling. That feeling when you're building something
    with whatever you have — no perfect setup, no senior engineer to ask.
    Just you, a terminal, and a problem you refuse to walk away from.
  </p>

  <p>That's what scrappy means to me.</p>

  <h2>The Scrappy Mindset</h2>

  <p>Most tutorials teach you to use things. ScrapyBytes tries to teach you what things are.</p>

  <p>
    There's a difference between knowing how to call an API and understanding
    that at the bottom of everything — your browser, your phone, this very
    webpage — there are transistors switching between two states. On and off.
    One and zero.
  </p>

  <p>I spent years writing code without knowing any of that. And honestly? It showed.</p>

  <h2>Byte by Byte</h2>

  <p>"Byte by byte" isn't just a tagline. It's a pace.</p>

  <p>
    I tried every shortcut — the 10-hour YouTube courses, the bootcamp
    cheatsheets, the copy-paste mentality. And I kept hitting the same wall.
    The one that appears when something breaks and you have no idea why.
  </p>

  <p>Because you skipped the foundation.</p>

  <p>ScrapyBytes is my attempt to fix that. Not just for me.</p>

  <h2>The Ecosystem</h2>

  <p>ScrapyBytes doesn't exist alone.</p>

  <p>
    It's the education layer of something bigger I've been quietly building.
    ScrapyChain handles the blockchain infrastructure. ScrapyBytes teaches
    you what runs beneath it. Eventually, there's a world built on top.
  </p>

  <p>Each piece was built scrappy. From scratch. With intention.</p>

  <h2>The Anchor</h2>

  <p>Chanakya said: know the root before you study the tree.</p>

  <p>
    I think about that every time someone asks why I'm learning how
    transistors work when I could just learn React. Because React doesn't
    matter if you don't understand why it exists. The tree doesn't matter
    without the root.
  </p>

  <p>Every transistor is a decision.</p>
  <p>Every bit is a choice.</p>
  <p>Every byte you understand is ground you'll never lose.</p>

  <footer>
    <p>Every bit was a choice.</p>
  </footer>
</main>

---

No classes. No styling. No extra imports. Stop.
```

---

### 2D — Apply styling

```
In src/app/philosophy/page.tsx only.
Add Tailwind classes to existing elements. No layout changes. No new elements.

<main>:           max-w-2xl mx-auto px-6 py-20
<h1>:             font-display text-4xl font-bold text-neon-cyan mb-8 leading-tight
<h2>:             font-mono text-xs font-semibold text-neon-lime uppercase tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3
All <p> tags:     font-body text-fg-dim leading-relaxed mb-4
Last three <p>
before <footer>:  font-mono text-fg text-sm mb-2
<footer>:         mt-20 pt-8 border-t border-line
<footer> <p>:     font-mono text-neon-amber text-sm italic text-center

No new components. No new colors. Stop.
```

---

### 2E — Add metadata

```
In src/app/philosophy/page.tsx only.
Add this export directly above the component function:

export const metadata = {
  title: "Philosophy | ScrapyBytes",
  description:
    "Why Scrapy? The mindset and mission behind ScrapyBytes - CS education from bits to blockchain.",
};

No other changes. Stop.
```

---

### 2F — Voice review

```
Read src/app/philosophy/page.tsx.
Check the content nodes only (ignore JSX, classes, imports).

Flag any of the following:
1. AI-generated phrasing — overly smooth, no rough edges, sounds like a product page
2. Sentences starting with: Furthermore, Moreover, In conclusion, It is important to, In today's world
3. Three or more grammatically parallel sentences in a row (lists disguised as prose)
4. Tone shift — the voice should sound like a builder writing for himself, not marketing copy

Report as a numbered list with line reference and suggested fix.
If nothing is flagged, write: Voice clean.
Do not rewrite anything. Stop.
```

---

## PHASE 3 — CONTENT HUMANISATION GUIDE

The following is not a Claude Code prompt. It is guidance for you (the human) on how to review and rewrite existing topic content so it has soul.

### What AI-written content sounds like

- Every sentence is complete and well-formed. No fragments.
- Transitions are smooth. "Furthermore." "This means that." "As we can see."
- Parallel structure everywhere. Three bullets. Three points. Three examples.
- No confusion, no tangent, no moment where the writer changes their mind mid-sentence.
- It informs. It never wonders.

### What human-written content sounds like

- Fragments. Used deliberately. For rhythm.
- A sentence that starts one way and ends somewhere you didn't expect.
- A question the writer doesn't fully answer, because they haven't fully figured it out yet.
- An aside. Like this. That breaks the flow but tells you something true.
- The writer's perspective on the material, not just the material.

### The peer review prompt (use after you write a section yourself)

```
Read the content section I've pasted below.
Do not rewrite it.
Flag only these four things, with line references:

1. Any phrase that reads like generated text — too smooth, too complete, no rough edges
2. Any transition word that signals AI: Furthermore, Moreover, Therefore, Thus, In conclusion
3. Any three consecutive sentences with the same grammatical structure
4. Any sentence that explains what something IS without any sense of why the writer thinks it matters

Report as a numbered list. If none found, write: Voice clean.

[PASTE YOUR SECTION HERE]
```

### How to write content that feels alive (checklist)

Before submitting a content section, ask yourself:

- [ ] Does this section contain at least one sentence I would feel slightly embarrassed by? (Good. That's the honest part.)
- [ ] Is there a moment where I admit I didn't understand something at first?
- [ ] Does it have at least one fragment or unconventional sentence?
- [ ] Is there something in here that you can only know by having actually done it?
- [ ] Would a product marketing team want to remove a sentence? (Keep that sentence.)

---

## PHASE 4 — BUILD CHECK

```
Run: npm run build
Show errors and warnings only.
Do not auto-fix anything. Report each error with file name and line number. Stop.
```

---

## PHASE 5 — COMMIT

Only after build is clean:

```
Stage and commit with this message:
rebrand: BitRoot -> ScrapyBytes + add /philosophy page

Run git status after to confirm.
```

---

## TOKEN COST GUIDE

| Prompt type | Approx. cost | Why |
|---|---|---|
| Discovery (grep, no edits) | Very low | No file reads, no output generation |
| Single-file replacement | Low | One file in, one file out |
| Multi-file batch (1I) | Medium | Multiple reads, but replacements are mechanical |
| Scaffold + content | Medium | Generating new JSX from spec |
| "Rebrand everything" (avoid) | Very high | Forces full codebase read + long plan |
| "Make it better" (avoid) | Very high | Open-ended = maximum exploration + generation |

**Rules that save tokens:**
1. Always include the exact old string and exact new string. Never say "update the title."
2. Always say "No other files." at the end of every prompt.
3. Always say "Stop." — it prevents the model from narrating what it just did.
4. Run discovery before editing. Never ask the model to find AND fix in the same prompt.
5. Verify with grep, not by asking the model to summarise what it changed.
