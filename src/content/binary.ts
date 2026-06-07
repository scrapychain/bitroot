import type { PageContent } from "@/types/content";

const rustBinaryPrint = `fn main() {
    let n: u8 = 13;
    // {:08b} = 8-digit binary, zero-padded
    println!("{} → {:08b}", n, n);
    // prints: 13 → 00001101
}`;

const cBinaryPrint = `#include <stdio.h>

int main(void) {
    unsigned char n = 13;
    // C has no %b, so print bit by bit
    printf("%d → ", n);
    for (int i = 7; i >= 0; i--)
        putchar((n >> i) & 1 ? '1' : '0');
    putchar('\\n');
    return 0;
}`;

const rustBitTricks = `fn main() {
    let x: u8 = 0b0010_1100;

    // is bit 3 set?
    let bit3 = (x >> 3) & 1;       // 1

    // set bit 0
    let y = x | 1;                  // 0010_1101

    // clear bit 2
    let z = x & !(1 << 2);          // 0010_1000

    // toggle bit 5
    let w = x ^ (1 << 5);           // 0000_1100

    // count ones (population count)
    let ones = x.count_ones();      // 3

    println!("{} {} {} {} {}", bit3, y, z, w, ones);
}`;

const cBitTricks = `#include <stdio.h>

int main(void) {
    unsigned char x = 0b00101100;

    // is bit 3 set?
    int bit3 = (x >> 3) & 1;       // 1

    // set bit 0
    unsigned char y = x | 1;        // 0010_1101

    // clear bit 2
    unsigned char z = x & ~(1 << 2); // 0010_1000

    // toggle bit 5
    unsigned char w = x ^ (1 << 5); // 0000_1100

    // count ones (gcc/clang builtin)
    int ones = __builtin_popcount(x); // 3

    printf("%d %u %u %u %d\\n", bit3, y, z, w, ones);
    return 0;
}`;

const rustFloat = `fn main() {
    let a: f32 = 0.1;
    let b: f32 = 0.2;

    // raw 32-bit pattern of 0.1
    println!("0.1 bits = {:032b}", a.to_bits());
    println!("0.1+0.2 = {}", a + b);
    // 0.30000001
    println!("equal?  = {}", a + b == 0.3);
    // false
}`;

const cFloat = `#include <stdio.h>
#include <stdint.h>
#include <string.h>

int main(void) {
    float a = 0.1f, b = 0.2f;

    // reinterpret bits without UB
    uint32_t bits;
    memcpy(&bits, &a, sizeof(bits));

    printf("0.1 bits = 0x%08x\\n", bits);
    printf("0.1+0.2 = %.10f\\n", a + b);
    printf("equal?  = %d\\n", (a + b) == 0.3f);
    return 0;
}`;

const rustSatoshis = `fn satoshis_to_btc(satoshis: u64) -> f64 {
    satoshis as f64 / 100_000_000.0
    // note: display only; never use floats
    // for actual Bitcoin arithmetic
}

fn main() {
    let balance: u64 = 100_000_000; // 1 BTC in satoshis
    println!("Balance: {} BTC", satoshis_to_btc(balance));

    // Bitcoin amounts as integer bits
    println!("As bits: {:064b}", balance);
    println!("As hex:  {:#018x}", balance);
    // 0x0000000005f5e100
}`;

const cSatoshis = `#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint64_t balance = 100000000; // 1 BTC in satoshis
    printf("Balance: %.8f BTC\\n", balance / 100000000.0);
    printf("As hex: 0x%016lx\\n", balance);
    // 0x0000000005f5e100
    return 0;
}`;

export const binary: PageContent = {
  slug: "binary",
  hexLabel: "0x02",
  category: "binary",
  hero: {
    eyebrow: "root.system / 0x02 / binary",
    title: `Two symbols.<br><span class="highlight">Everything else.</span>`,
    lede: `Every photo, song, message and program on every device you've ever touched is, at the lowest level, a sequence of <code>0</code>s and <code>1</code>s. This page walks you from <em>"what does that even mean"</em> all the way down to two's complement and IEEE 754, which is the machine's actual view of a number.`,
    narrativeHtml: `<p>On page one you learned that a single number can wear many costumes.</p>
<p>Binary is the only one the machine actually wears.</p>
<p>Two symbols. <code>0</code> and <code>1</code>. Thats the entire alphabet. Every photo youve saved, every song youve streamed, every message youve ever sent is spelled with just those two letters.</p>
<p>The obvious question is why.</p>
<p>Why two? Why not ten, like your fingers? Why not something richer and more expressive?</p>
<p>The answer isnt engineering. It isnt convention. Its physics.</p>
<p>In 1947, three physicists at Bell Labs built the first transistor. A switch with no moving parts. And a switch can do exactly one reliable thing. It can be on, or it can be off.</p>
<p>Not on-ish. Not seventy percent on. On or off. A voltage above the line, or below it.</p>
<p>Try to store ten distinct levels in that switch and noise destroys you. The real world smears your values together until you cant tell them apart. But two states? Two states are almost impossible to confuse.</p>
<p>So the machine doesnt speak binary because someone chose it.</p>
<p>It speaks binary because thats the only language that survives contact with a noisy electrical world.</p>
<p>Everything above this page, every number system, every program, every blockchain, is a tower built on these two symbols.</p>
<p>This is the bedrock.</p>
<p>Lets learn to read it.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What is **binary**, really?",
      blocks: [
        {
          kind: "prose",
          html: `<p>In 1947, a physicist at Bell Labs made electricity change direction. He called it a <strong>transistor</strong>.</p>
<p>A transistor is just a switch. It has two states. High voltage or low voltage. On or off. <code>1</code> or <code>0</code>.</p>
<p>That is the entire foundation of every computer ever built. Not because someone chose binary arbitrarily; because physics made it inevitable. A switch with two states is the simplest reliable building block that exists. Everything else is just what you can build when you wire enough of them together.</p>`,
        },
        {
          kind: "prose",
          html: `<p>You already know how to count. When you write <code>237</code>, you don't think about it, but you're using a system called <strong>base-10</strong>: ten symbols (<code>0</code> through <code>9</code>), and each position is worth ten times more than the one to its right.</p>
<p><code>237</code> means <em>2×100 + 3×10 + 7×1</em>.</p>
<p>Binary is the same idea, but with only two symbols: <code>0</code> and <code>1</code>. Each position is worth twice as much as the one to its right. That's it. That's the whole thing.</p>`,
        },
        { kind: "heading", text: "Counting the binary way" },
        {
          kind: "table",
          headers: ["position", "value", "example bit", "contributes"],
          rows: [
            ["2⁰", "1", "1", "1"],
            ["2¹", "2", "0", "0"],
            ["2²", "4", "1", "4"],
            ["2³", "8", "1", "8"],
          ],
        },
        {
          kind: "raw",
          html: `<p class="mono dim" style="margin-top:-0.5rem"><code>1101</code> in binary &nbsp;=&nbsp; 8 + 4 + 0 + 1 &nbsp;=&nbsp; <span style="color:var(--neon-lime)">13</span> in decimal</p>`,
        },
        { kind: "heading", text: "Why two symbols?" },
        {
          kind: "prose",
          html: `<p>Computers are built from billions of tiny switches. A switch has two natural states: <strong>off</strong> (low voltage) and <strong>on</strong> (high voltage). Map <code>0</code> to off, <code>1</code> to on, and suddenly numbers, letters, images, and code are all just patterns of switch-states. The switch itself, the transistor, gets its own page later on.</p>`,
        },
        { kind: "heading", text: "Try it: toggle eight switches" },
        { kind: "widget", name: "bit-toggle" },
        {
          kind: "raw",
          html: `<p class="connection-line">Every transistor in your CPU is one of these switches. Your CPU has about 100 billion of them. <a href="/logic-gates">← see: logic gates</a></p>`,
        },
        { kind: "heading", text: "Your first program: print a number in binary" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBinaryPrint },
            c: { language: "c", code: cBinaryPrint },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// takeaway",
          body: `A bit is one switch. Eight bits make a byte. Everything bigger is just more bytes.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Bitwise **operations** &amp; signed numbers",
      blocks: [
        {
          kind: "prose",
          html: `<p>Once numbers live as bits, you can do something you can't do as easily in decimal: operate on each bit independently. These are the <strong>bitwise operators</strong>, and they're shockingly fast because the CPU can do them in a single cycle.</p>`,
        },
        {
          kind: "table",
          headers: ["op", "name", "does", "example"],
          rows: [
            ["<code>&amp;</code>", "AND", "both bits 1", "<code>0b1100 &amp; 0b1010 = 0b1000</code>"],
            ["<code>|</code>", "OR", "either bit 1", "<code>0b1100 | 0b1010 = 0b1110</code>"],
            ["<code>^</code>", "XOR", "bits differ", "<code>0b1100 ^ 0b1010 = 0b0110</code>"],
            [
              "<code>!</code> / <code>~</code>",
              "NOT",
              "flip every bit",
              "<code>~0b1100 = 0b0011</code> (in 4 bits)",
            ],
            ["<code>&lt;&lt;</code>", "shift left", "multiply by 2", "<code>0b0011 &lt;&lt; 1 = 0b0110</code>"],
            ["<code>&gt;&gt;</code>", "shift right", "divide by 2", "<code>0b0110 &gt;&gt; 1 = 0b0011</code>"],
          ],
        },
        { kind: "heading", text: "Negative numbers: two's complement" },
        {
          kind: "prose",
          html: `<p>Computers don't have a "minus sign" wire. So how do they store <em>−5</em>? They use a clever convention called <strong>two's complement</strong>: take the positive number, flip every bit, then add 1. The leftmost bit becomes a <em>sign bit</em>: <code>0</code> for positive, <code>1</code> for negative.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="mono dim">&nbsp;5 (8-bit) = <code>00000101</code><br>flip       = <code>11111010</code><br>+ 1        = <code>11111011</code> &nbsp;←&nbsp; this is −5</p>`,
        },
        {
          kind: "prose",
          html: `<p>The genius: addition <em>just works</em>. <code>5 + (−5)</code> as bits is <code>00000101 + 11111011 = 100000000</code>. The 9th bit overflows out, and you're left with <code>00000000</code> = 0. The hardware doesn't need separate adders for signed and unsigned numbers.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">SHA-256, the algorithm that secures Bitcoin, is 64 rounds of AND, OR, XOR, NOT, bit rotations and bit shifts. The same six operations in the table above. Logic gates doing mathematics at billions of cycles per second. <a href="/hashing">← see: hashing</a></p>`,
        },
        { kind: "heading", text: "Bit tricks you'll actually use" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitTricks },
            c: { language: "c", code: cBitTricks },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the pattern",
          body: `<strong>Test</strong> a bit with <code>&amp;</code>, <strong>set</strong> with <code>|</code>, <strong>clear</strong> with <code>&amp; ~</code>, <strong>toggle</strong> with <code>^</code>. Memorise this and bit manipulation becomes muscle memory.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">When the OS marks a file as readable, writable, or executable it sets three bits in a permission byte. <code>chmod 755</code> is just three octal digits. Each one is three bits. Your entire filesystem security model is bitwise flags. <a href="/operating-system">← see: operating system</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Floats, endianness &amp; **why 0.1 + 0.2 ≠ 0.3**",
      blocks: [
        { kind: "heading", text: "IEEE 754: how computers store decimals" },
        {
          kind: "prose",
          html: `<p>Integers are easy: a fixed pattern of bits, one fixed value. Decimals are a different story. Computers use a binary version of scientific notation called <strong>IEEE 754</strong>. A 32-bit float splits into three fields:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            { label: "sign", value: "1 bit", desc: "0 = positive, 1 = negative." },
            {
              label: "exponent",
              value: "8 bits",
              desc: "Biased by 127. Tells you which power of 2 to multiply by.",
            },
            {
              label: "mantissa",
              value: "23 bits",
              desc: "The significant digits, in binary, with an implicit leading 1.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>The number is reconstructed as <code>(−1)<sup>sign</sup> × 1.mantissa × 2<sup>exp − 127</sup></code>. The catch: most decimal fractions aren't exactly representable in binary. <code>0.1</code> in binary is a repeating fraction, just like <code>1/3</code> is in decimal. So <code>0.1 + 0.2</code> stores as <code>0.30000000000000004</code> on virtually every machine.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustFloat },
            c: { language: "c", code: cFloat },
          },
        },
        { kind: "heading", text: "Endianness: how bytes line up in memory" },
        {
          kind: "prose",
          html: `<p>A 32-bit integer is four bytes. But in <em>what order</em> are those bytes laid out in memory? Two conventions exist: <strong>little-endian</strong> (least significant byte first, used by x86 and ARM by default) and <strong>big-endian</strong> (most significant byte first, used by network protocols and older CPUs).</p>`,
        },
        {
          kind: "raw",
          html: `<p class="mono dim">0x<span style="color:var(--neon-magenta)">DE</span><span style="color:var(--neon-cyan)">AD</span><span style="color:var(--neon-lime)">BE</span><span style="color:var(--neon-amber)">EF</span> stored in memory:<br>little-endian: <code>EF BE AD DE</code> &nbsp;←&nbsp; what your laptop does<br>big-endian:&nbsp;&nbsp;&nbsp; <code>DE AD BE EF</code> &nbsp;←&nbsp; what TCP/IP uses</p>`,
        },
        {
          kind: "prose",
          html: `<p>This matters when you read raw bytes from disk, the network, or shared memory between architectures. Forget about it and you get silently corrupted data.</p>`,
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// gotcha",
          body: `Never compare floats with <code>==</code>. Compare with an epsilon: <code>(a − b).abs() &lt; 1e-6</code>. Use integer or fixed-point math when correctness matters (currency, accounting, blockchain consensus).`,
        },
        { kind: "heading", text: "Binary in blockchain" },
        {
          kind: "prose",
          html: `<p>Every concept on this page appears inside a Bitcoin node.</p>
<p><strong>SHA-256</strong> uses bitwise AND, XOR, NOT and bit rotations: the exact operations from the intermediate section above. 64 rounds, billions of times per second.</p>
<p>Bitcoin transaction amounts are <strong>64-bit unsigned integers</strong> (<code>u64</code> in Rust). Stored in little-endian byte order. The same endianness your x86 CPU uses.</p>
<p>The <code>0.1 + 0.2</code> problem is why blockchain ledgers <em>never</em> use floats. Every balance is stored as an integer. In Bitcoin, the unit is <strong>satoshis</strong>. <code>1 BTC = 100,000,000 satoshis</code>. Integer math, exact, always.</p>
<p>A blockchain private key is <strong>256 bits</strong> of random data. 32 bytes. The same bit patterns this page is about, just 256 of them. Chosen once, never shared, never lost.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustSatoshis },
            c: { language: "c", code: cSatoshis },
          },
        },
        { kind: "heading", text: "Where this lands you" },
        {
          kind: "prose",
          html: `<p>You now have the substrate. You know what a bit is, how integers and decimals are encoded, and how the CPU manipulates them. Next: how those bits become <strong>letters</strong>.</p>`,
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "logic-gates",
        text: `Every bit is a voltage held by a transistor, and logic gates are the switches that store and combine those bits. Binary is the language; gates are the hardware that speaks it.`,
      },
      {
        slug: "number-systems",
        text: `Binary is base two. The number systems page covers every base; binary is the one with two symbols, the only base the hardware understands natively.`,
      },
      {
        slug: "ascii",
        text: `ASCII is binary with a meaning attached. <code>0100 0001</code> is the bits; A is what we agree they spell. Encoding is binary plus a convention.`,
      },
      {
        slug: "cpu",
        text: `The CPU is binary in motion: registers hold bits, the ALU adds them, instructions are bit patterns. Everything on the CPU page is the binary on this one, clocked.`,
      },
      {
        slug: "memory",
        text: `Memory is addressable binary. Every byte is eight bits at a numbered location. The memory page is where the bits from this page actually live.`,
      },
      {
        slug: "variables",
        text: `The type decides how a variable's bits are read. The same 32 bits are an <code>i32</code> or an <code>f32</code>. Two's complement and IEEE 754 from this page are why.`,
      },
      {
        slug: "hashing",
        text: `SHA-256 turns bytes into exactly 256 bits, and flipping one input bit flips about half the output bits. Hashing is binary arithmetic at its most violent.`,
      },
      {
        slug: "networking",
        text: `Every packet is binary and every IP address is 32 bits of it. The networking page is binary at planet scale.`,
      },
      {
        slug: "blockchain",
        text: `Bitcoin private keys are 256 random bits and amounts are 64-bit integers. The blockchain page is hashes of hashes of hashes, all of it binary, all of it integer math.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x03",
    title: "Bytes become letters: ASCII & Unicode",
    href: "/ascii",
    label: "ascii",
    variant: "magenta",
  },
};
