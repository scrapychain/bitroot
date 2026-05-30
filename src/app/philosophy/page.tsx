export const metadata = {
  title: "Philosophy | ScrapyBytes",
  description:
    "Why Scrapy? The mindset and mission behind ScrapyBytes - CS education from bits to blockchain.",
};

export default function PhilosophyPage() {
  return (
    <main id="philosophy" className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl font-bold text-neon-cyan mb-8 leading-tight">
        Why Scrapy?
      </h1>

      <p className="font-body text-fg-dim leading-relaxed mb-4">I didn&apos;t name it after a framework.</p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        I named it after a feeling. That feeling when you&apos;re building
        something with whatever you have — no perfect setup, no senior
        engineer to ask. Just you, a terminal, and a problem you refuse
        to walk away from.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">That&apos;s what scrappy means to me.</p>

      <h2 className="font-mono text-xs font-semibold text-neon-lime uppercase tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3">
        The Scrappy Mindset
      </h2>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        Most tutorials teach you to use things. ScrapyBytes tries to teach you what things are.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        There&apos;s a difference between knowing how to call an API and
        understanding that at the bottom of everything — your browser,
        your phone, this very webpage — there are transistors switching
        between two states. On and off. One and zero.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        I spent years writing code without knowing any of that. And honestly? It showed.
      </p>

      <h2 className="font-mono text-xs font-semibold text-neon-lime uppercase tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3">
        Byte by Byte
      </h2>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        &quot;Byte by byte&quot; isn&apos;t just a tagline. It&apos;s a pace.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        I tried every shortcut — the 10-hour YouTube courses, the
        bootcamp cheatsheets, the copy-paste mentality. And I kept
        hitting the same wall. The one that appears when something
        breaks and you have no idea why.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">Because you skipped the foundation.</p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        ScrapyBytes is my attempt to fix that. Not just for me.
      </p>

      <h2 className="font-mono text-xs font-semibold text-neon-lime uppercase tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3">
        The Ecosystem
      </h2>

      <p className="font-body text-fg-dim leading-relaxed mb-4">ScrapyBytes doesn&apos;t exist alone.</p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        It&apos;s the education layer of something bigger I&apos;ve been quietly
        building. ScrapyChain handles the blockchain infrastructure.
        ScrapyBytes teaches you what runs beneath it. Eventually,
        there&apos;s a world built on top.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        Each piece was built scrappy. From scratch. With intention.
      </p>

      <h2 className="font-mono text-xs font-semibold text-neon-lime uppercase tracking-widest mt-14 mb-4 border-l-2 border-neon-lime pl-3">
        The Anchor
      </h2>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        Chanakya said: know the root before you study the tree.
      </p>

      <p className="font-body text-fg-dim leading-relaxed mb-4">
        I think about that every time someone asks why I&apos;m learning
        how transistors work when I could just learn React. Because
        React doesn&apos;t matter if you don&apos;t understand why it exists.
        The tree doesn&apos;t matter without the root.
      </p>

      <p className="font-mono text-fg text-sm mb-2">Every transistor is a decision.</p>
      <p className="font-mono text-fg text-sm mb-2">Every bit is a choice.</p>
      <p className="font-mono text-fg text-sm mb-2">Every byte you understand is ground you&apos;ll never lose.</p>

      <footer className="mt-20 pt-8 border-t border-line">
        <p className="font-mono text-neon-amber text-sm italic text-center">Every bit was a choice.</p>
      </footer>
    </main>
  );
}
