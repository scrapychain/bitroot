import type { PageContent } from "@/types/content";

const rustParseFormat = `// Same number, four bases. The compiler accepts each form.
fn main() {
    let a = 255;        // decimal
    let b = 0b1111_1111; // binary literal
    let c = 0o377;       // octal literal
    let d = 0xff;        // hexadecimal literal

    println!("{} {} {} {}", a, b, c, d);
    // 255 255 255 255 (same value, four notations).

    // Format any number into any base:
    let n = 173;
    println!("dec {n}");           // 173
    println!("hex {n:#x}");        // 0xad
    println!("oct {n:#o}");        // 0o255
    println!("bin {n:#010b}");     // 0b10101101  (10-char, zero-padded)
}`;

const cParseFormat = `#include <stdio.h>

int main(void) {
    int a = 255;        // decimal
    int b = 0xff;       // hexadecimal literal
    int c = 0377;       // octal literal: leading 0 means octal in C
    // C has no native binary literal; use shifts or 0b... (gcc/clang ext.)
    int d = 0b11111111;

    printf("%d %d %d %d\\n", a, b, c, d);
    // 255 255 255 255

    int n = 173;
    printf("dec %d\\n",   n);   // 173
    printf("hex 0x%x\\n", n);   // 0xad
    printf("oct 0%o\\n",  n);   // 0255
    // C has no %b, so print bit-by-bit (see /binary):
    printf("bin 0b");
    for (int i = 7; i >= 0; i--)
        putchar((n >> i) & 1 ? '1' : '0');
    putchar('\\n');
    return 0;
}`;

const rustConvert = `// Convert any positive integer into any base 2..36, by hand.
// (The standard library covers 2/8/10/16; this works for any.)
fn to_base(mut n: u32, base: u32) -> String {
    assert!((2..=36).contains(&base));
    if n == 0 { return "0".into(); }
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut out = Vec::new();
    while n > 0 {
        out.push(DIGITS[(n % base) as usize]);
        n /= base;
    }
    out.reverse();
    String::from_utf8(out).unwrap()
}

fn main() {
    let n = 1_000_000;
    println!("base  2: {}", to_base(n, 2));   // 11110100001001000000
    println!("base  8: {}", to_base(n, 8));   // 3641100
    println!("base 16: {}", to_base(n, 16));  // f4240
    println!("base 36: {}", to_base(n, 36));  // lfls
}`;

const cConvert = `#include <stdio.h>
#include <string.h>
#include <assert.h>

void to_base(unsigned int n, unsigned int base, char *out) {
    assert(base >= 2 && base <= 36);
    static const char digits[] = "0123456789abcdefghijklmnopqrstuvwxyz";
    if (n == 0) { strcpy(out, "0"); return; }

    char buf[40];
    int i = 0;
    while (n > 0) {
        buf[i++] = digits[n % base];
        n /= base;
    }
    // reverse buf into out
    for (int j = 0; j < i; j++) out[j] = buf[i - 1 - j];
    out[i] = '\\0';
}

int main(void) {
    char out[40];
    to_base(1000000, 2,  out); printf("base  2: %s\\n", out);
    to_base(1000000, 8,  out); printf("base  8: %s\\n", out);
    to_base(1000000, 16, out); printf("base 16: %s\\n", out);
    to_base(1000000, 36, out); printf("base 36: %s\\n", out);
    return 0;
}`;

const rustGray = `// Gray code: a binary encoding where consecutive numbers
// differ by exactly one bit. Useful for rotary encoders,
// Karnaugh maps, and any setting where transition glitches matter.
fn to_gray(n: u32) -> u32 { n ^ (n >> 1) }
fn from_gray(g: u32) -> u32 {
    let mut n = g;
    let mut shift = 1;
    while (g >> shift) > 0 { n ^= g >> shift; shift += 1; }
    n
}

fn main() {
    println!("n  bin     gray");
    for n in 0u32..8 {
        println!("{n}  {n:03b}    {:03b}", to_gray(n));
    }
    // 0  000     000
    // 1  001     001
    // 2  010     011  ← bit 1 flipped
    // 3  011     010  ← bit 0 flipped
    // 4  100     110  ← bit 2 flipped
    // 5  101     111
    // 6  110     101
    // 7  111     100
    assert_eq!(from_gray(to_gray(42)), 42);
}`;

const cGray = `#include <stdio.h>
#include <stdint.h>
#include <assert.h>

uint32_t to_gray(uint32_t n)   { return n ^ (n >> 1); }
uint32_t from_gray(uint32_t g) {
    uint32_t n = g;
    for (uint32_t s = 1; (g >> s) > 0; s++) n ^= g >> s;
    return n;
}

int main(void) {
    printf("n  bin     gray\\n");
    for (uint32_t n = 0; n < 8; n++) {
        printf("%u  ", n);
        for (int i = 2; i >= 0; i--) putchar((n >> i) & 1 ? '1' : '0');
        printf("    ");
        uint32_t g = to_gray(n);
        for (int i = 2; i >= 0; i--) putchar((g >> i) & 1 ? '1' : '0');
        putchar('\\n');
    }
    assert(from_gray(to_gray(42)) == 42);
    return 0;
}`;

export const numberSystems: PageContent = {
  slug: "number-systems",
  hexLabel: "0x01",
  category: "numbers",
  hero: {
    eyebrow: "root.system / 0x01 / numbers",
    title: `Same number.<br><span class="highlight">Different bases.</span>`,
    lede: `<code>173</code>, <code>0xAD</code>, <code>0o255</code>, <code>0b10101101</code>: four ways of writing the exact same value. Different <strong>bases</strong> are convenient for different jobs. Decimal for humans, binary for circuits, hex for byte dumps, octal for Unix permissions. This page is what every other base actually <em>is</em>, and why programmers move between them so often.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What's a **base**, really?",
      blocks: [
        {
          kind: "prose",
          html: `<p><em>Your computer has never seen the number 173.</em><br>
<em>It has only ever seen <code>10101101</code>.</em><br>
<em>But your browser shows you <code>173</code>.</em><br>
<em>And your debugger shows you <code>0xAD</code>.</em><br>
<em>And your Unix terminal shows you <code>0o255</code>.</em></p>
<p><em>Same value.<br>
Four different masks.<br>
All hiding the same binary underneath.</em></p>
<p><strong>This is number systems.</strong></p>`,
        },
        {
          kind: "prose",
          html: `<p>A <strong>base</strong> (or <em>radix</em>) is just the number of distinct symbols you use to write numbers, plus the rule that <em>each position to the left is worth that many times more than the one to its right</em>. That's the whole idea. Once you see it, every base in the world reduces to the same shape.</p>
<p>You write <code>237</code> in <strong>base 10</strong> because you have ten symbols (<code>0</code> to <code>9</code>) and each position is a power of ten:</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">237<sub>10</sub> = 2×10² + 3×10¹ + 7×10⁰<br>     = 200 + 30 + 7</p>`,
        },
        {
          kind: "prose",
          html: `<p>Swap the base for any other number, keep the same idea. <strong>Base 2</strong>: two symbols (<code>0</code>, <code>1</code>), each place is a power of 2. <strong>Base 16</strong>: sixteen symbols (<code>0</code> to <code>9</code>, <code>A</code> to <code>F</code>), each place a power of 16.</p>`,
        },
        { kind: "heading", text: "The four bases you'll actually meet" },
        {
          kind: "table",
          headers: ["base", "name", "symbols", "where it shows up"],
          rows: [
            [
              "<strong>10</strong>",
              "decimal",
              "0-9",
              "Everyday humans. The default everywhere except inside the machine.",
            ],
            [
              "<strong>2</strong>",
              "binary",
              "0, 1",
              "What the silicon literally does. See the next page.",
            ],
            [
              "<strong>8</strong>",
              "octal",
              "0-7",
              "Unix file permissions (<code>chmod 755</code>), older minicomputers.",
            ],
            [
              "<strong>16</strong>",
              "hexadecimal",
              "0-9, A-F",
              "Memory addresses, byte dumps, CSS colors, MAC addresses, MD5 hashes.",
            ],
          ],
        },
        { kind: "heading", text: "Why so many?" },
        {
          kind: "prose",
          html: `<p>Two reasons: <strong>physics</strong> and <strong>ergonomics</strong>.</p>
<ul>
  <li><strong>Physics</strong> picks <em>binary</em>. A switch is the simplest reliable building block; it has two states. Base 2 is the natural language of circuits.</li>
  <li><strong>Ergonomics</strong> picks <em>hex</em> for humans reading machine state. Long binary strings are tiring to scan: <code>11001010111110101011111000001101</code>. The same value in hex is just <code>CAFEBE0D</code>. Eight characters instead of thirty-two; same information, far easier to remember and compare.</li>
</ul>
<p>Hex works for this because <strong>16 = 2⁴</strong>: every hex digit is exactly four binary digits. Splitting a 32-bit value into 8 hex digits is a no-arithmetic operation. Octal works the same way (8 = 2³, three bits per octal digit), and that's the reason it ever existed at all.</p>`,
        },
        { kind: "heading", text: "Try it: convert any number" },
        { kind: "widget", name: "base-converter" },
        { kind: "heading", text: "Same value, four ways of writing it" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustParseFormat },
            c: { language: "c", code: cParseFormat },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the prefixes",
          body: `<code>0b</code>… is binary, <code>0o</code>… is octal (Rust), leading <code>0</code> alone is octal (C, historic and a famous footgun: <code>010</code> in C is <strong>8</strong>, not 10), <code>0x</code>… is hex. No prefix means decimal. These prefixes show up in source code, debugger output, network logs, everywhere.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "**Hex** &amp; octal: the bases programmers live in",
      blocks: [
        {
          kind: "prose",
          html: `<p>Once you know binary, hex is almost free. Every hex digit is exactly four bits. Memorise that table once and you will read memory dumps for the rest of your life.</p>`,
        },
        {
          kind: "table",
          headers: ["hex", "decimal", "binary", "hex", "decimal", "binary"],
          rows: [
            ["<code>0</code>", "0", "<code>0000</code>", "<code>8</code>", "8", "<code>1000</code>"],
            ["<code>1</code>", "1", "<code>0001</code>", "<code>9</code>", "9", "<code>1001</code>"],
            ["<code>2</code>", "2", "<code>0010</code>", "<code>A</code>", "10", "<code>1010</code>"],
            ["<code>3</code>", "3", "<code>0011</code>", "<code>B</code>", "11", "<code>1011</code>"],
            ["<code>4</code>", "4", "<code>0100</code>", "<code>C</code>", "12", "<code>1100</code>"],
            ["<code>5</code>", "5", "<code>0101</code>", "<code>D</code>", "13", "<code>1101</code>"],
            ["<code>6</code>", "6", "<code>0110</code>", "<code>E</code>", "14", "<code>1110</code>"],
            ["<code>7</code>", "7", "<code>0111</code>", "<code>F</code>", "15", "<code>1111</code>"],
          ],
        },
        { kind: "heading", text: "Where hex shows up in real life" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "addresses",
              value: "0x7ffeef3a4c20",
              desc: "Pointers and memory addresses are always printed in hex; easier to spot alignment, page boundaries, and patterns.",
            },
            {
              label: "colors",
              value: "#FF2BD6",
              desc: "Web/CSS color codes are three pairs of hex bytes: red, green, blue. The neon-magenta on this page is exactly that.",
            },
            {
              label: "byte dumps",
              value: "DE AD BE EF",
              desc: "Network packets, file headers, hex editors. Anywhere raw bytes are inspected, hex is the format.",
            },
            {
              label: "hashes",
              value: "5d41402a…",
              desc: "MD5, SHA-256 and friends emit fixed-width hex strings. 32 hex chars = 128 bits = MD5.",
            },
            {
              label: "mac",
              value: "AC:DE:48:00:11:22",
              desc: "Network hardware addresses are six hex bytes, separated by colons.",
            },
            {
              label: "magic numbers",
              value: "0xCAFEBABE",
              desc: "Java <code>.class</code> files start with <code>CAFEBABE</code>; PNG starts with <code>89 50 4E 47</code>; ELF with <code>7F 45 4C 46</code>. File-format signatures are pure hex.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connection: hashing",
          body: `Every SHA-256 hash is 64 hex characters. 64 hex × 4 bits = <strong>256 bits</strong>. That's the entire security model of Bitcoin - one 256-bit number that's practically impossible to reverse. <a href="/hashing" class="inline-link">← See: Hashing</a>`,
        },
        { kind: "heading", text: "Octal: the survivor" },
        {
          kind: "prose",
          html: `<p>Octal is rare today, but two places still use it constantly:</p>
<ul>
  <li><strong>Unix file permissions.</strong> <code>chmod 755 file</code> sets <code>rwxr-xr-x</code>. That <code>755</code> is octal: each digit is three bits (read, write, execute) for owner, group, and other. <code>7</code> = <code>111</code> = rwx. <code>5</code> = <code>101</code> = r-x. The grouping <em>is</em> why octal was chosen here.</li>
  <li><strong>Old hardware.</strong> The PDP-8 (12-bit words) and PDP-11 (16-bit words) grouped bits by threes, so all their assemblers and manuals wrote everything in octal.</li>
</ul>`,
        },
        { kind: "heading", text: "Converting between bases, by hand" },
        {
          kind: "prose",
          html: `<p>The universal algorithm: <strong>repeated division</strong>. To convert <code>173</code> to base 16, divide by 16 and read the remainders bottom-up:</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">173 ÷ 16 = 10 remainder  13  (D)<br> 10 ÷ 16 =  0 remainder  10  (A)<br>read bottom-up: <span style="color:var(--neon-cyan)">AD</span> &nbsp;→&nbsp; 173<sub>10</sub> = AD<sub>16</sub></p>`,
        },
        {
          kind: "prose",
          html: `<p>The reverse, base 16 to base 10, is just multiplication by place value: <code>A×16 + D = 10×16 + 13 = 173</code>. Same shape, same algorithm; works for any base.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustConvert },
            c: { language: "c", code: cConvert },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the binary ↔ hex shortcut",
          body: `<strong>You don't have to divide</strong>. Group the binary digits in fours from the right and replace each group with its hex digit. <code>10101101</code> → <code>1010</code> <code>1101</code> → <code>A</code> <code>D</code> → <code>0xAD</code>. That's the <em>only</em> conversion most working programmers ever do by hand.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "**Other** number systems used in computing",
      blocks: [
        {
          kind: "prose",
          html: `<p>Decimal, binary, octal and hex cover 99% of what you'll meet. The remaining 1% is full of clever ideas that solve specific problems.</p>`,
        },
        { kind: "heading", text: "Binary-Coded Decimal (BCD)" },
        {
          kind: "prose",
          html: `<p>BCD encodes <em>each decimal digit</em> as 4 bits. The number 173 in BCD is three nibbles: <code>0001 0111 0011</code>, not the binary value 173 (which is <code>10101101</code>). Wasteful in storage (only 10 of 16 patterns used per nibble) but two genuine wins:</p>
<ul>
  <li><strong>Exact decimal arithmetic.</strong> Currency, accounting, and financial systems can't tolerate the rounding error of binary floats (see the binary page). BCD adds in decimal directly: <code>0.10 + 0.20</code> = exactly <code>0.30</code>, no surprises.</li>
  <li><strong>Direct display.</strong> Old calculators and 7-segment displays drove their digits straight from BCD nibbles, with no binary-to-decimal conversion needed for output.</li>
</ul>
<p>Modern decimal types (Java <code>BigDecimal</code>, Python <code>Decimal</code>, IEEE 754-2008's decimal floats) are spiritual descendants of BCD.</p>`,
        },
        { kind: "heading", text: "Gray code" },
        {
          kind: "prose",
          html: `<p>Standard binary counts <code>011 → 100</code> and three bits flip simultaneously. If the bits are sampled mid-transition (a rotary sensor, an analogue circuit), the reader could see a transient glitch like <code>111</code>: a value that's not even neighbouring. <strong>Gray code</strong> reorders the binary patterns so consecutive numbers differ by exactly one bit:</p>`,
        },
        {
          kind: "table",
          headers: ["n", "binary", "gray"],
          rows: [
            ["0", "<code>000</code>", "<code>000</code>"],
            ["1", "<code>001</code>", "<code>001</code>"],
            ["2", "<code>010</code>", "<code>011</code>"],
            ["3", "<code>011</code>", "<code>010</code>"],
            ["4", "<code>100</code>", "<code>110</code>"],
            ["5", "<code>101</code>", "<code>111</code>"],
            ["6", "<code>110</code>", "<code>101</code>"],
            ["7", "<code>111</code>", "<code>100</code>"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Notice every step is a single-bit flip. Used in: rotary encoders, KVM matrix scanners, Karnaugh-map minimisation, and certain genetic-algorithm encodings where you want neighbouring values to also be neighbours in the search space.</p>
<p>The conversion is famously elegant: one XOR with a right shift.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustGray },
            c: { language: "c", code: cGray },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the full chain",
          body: `Gray code uses XOR and bit shifts. XOR is a logic gate. A logic gate is transistors wired together. The same transistors that started this entire story. <a href="/logic-gates" class="inline-link">← See: Logic Gates</a>`,
        },
        { kind: "heading", text: "Base 64 (and friends)" },
        {
          kind: "prose",
          html: `<p>When binary data has to travel through a text-only channel (email bodies, JSON, URLs), it's encoded in <strong>base 64</strong>: 6 bits per character (2⁶ = 64 symbols, the alphabet <code>A</code> to <code>Z</code>, <code>a</code> to <code>z</code>, <code>0</code> to <code>9</code>, <code>+</code>, <code>/</code>). Three bytes (24 bits) become four base-64 characters; size grows by 33%. Variants include <em>base32</em> (case-insensitive, 5 bits per char) and <em>base58</em> (Bitcoin addresses, omits visually ambiguous <code>0OIl</code>).</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// base58: a safety decision disguised as a number system",
          body: `Bitcoin addresses use Base 58. Base 58 removes <code>0</code>, <code>O</code>, <code>I</code>, <code>l</code> - the characters that look the same in most fonts. Because a single misread character means your Bitcoin is gone forever. The encoding choice is a user-safety decision disguised as a number system. <a href="/blockchain" class="inline-link">← See: Blockchain</a>`,
        },
        { kind: "heading", text: "Larger and stranger bases" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "base 256",
              value: "Raw bytes",
              desc: "Treat each byte as a digit in a base-256 number. Big-integer libraries do this internally; addition becomes byte-by-byte with carries, exactly like long addition in school.",
            },
            {
              label: "base 36",
              value: "0-9, A-Z",
              desc: "Maximum compact alphanumeric encoding. Used for short URL slugs, license plates, ID codes (TOTP secrets are often base32 for the same reason).",
            },
            {
              label: "balanced ternary",
              value: "−1, 0, +1",
              desc: "Three symbols, one of which is negative. The 1958 Soviet computer Setun used it; Knuth called it 'perhaps the prettiest number system of all'.",
            },
            {
              label: "base φ",
              value: "Phinary",
              desc: "Base equals the golden ratio. Every integer has a unique representation. A delightful curio with no practical use, yet.",
            },
          ],
        },
        { kind: "heading", text: "Fixed-point: a different way to handle decimals" },
        {
          kind: "prose",
          html: `<p>Floats (IEEE 754, covered on the binary page) trade exactness for range. <strong>Fixed-point</strong> trades range for exactness: pick a fixed integer scale, then store all values as integers in that scale. Currency systems often store amounts as integer cents (never fractions of a cent) and never see floating-point rounding error.</p>
<p>It's not a different <em>base</em>; the underlying numbers are still binary integers. But it's a different <em>numeric system</em> built on top of binary. When correctness beats range (banking, blockchain ledgers, embedded control loops), fixed-point wins.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// from numbers to bits",
          body: `Decimal lives in your head. Hex lives in your debugger. Binary lives in the wires. The next page goes all the way down to that last layer: what binary actually <em>is</em>, and what you can do with it once you're there.`,
        },
        { kind: "heading", text: "Where number systems appear in ScrapyBytes" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "binary",
              value: "base 2",
              desc: "Binary is base 2. This page explains why - the next page shows what you do with it.",
              href: "/binary",
            },
            {
              label: "ascii",
              value: "'H' = 72 = 0x48",
              desc: "'H' = 72 decimal = 0x48 hex = 01001000 binary. Every character is a number in disguise.",
              href: "/ascii",
            },
            {
              label: "memory",
              value: "0x7ffeef3a…",
              desc: "Every memory address is a hex number. Understanding hex is required reading before touching pointers.",
              href: "/memory",
            },
            {
              label: "hashing",
              value: "64 hex chars",
              desc: "SHA-256 outputs 64 hex characters = 256 bits. The entire cryptographic security model is built on this one number.",
              href: "/hashing",
            },
            {
              label: "networking",
              value: "192.168.0.1",
              desc: "IP addresses are binary written as decimal. MAC addresses are hex. Two number systems in the same packet header.",
              href: "/networking",
            },
            {
              label: "blockchain",
              value: "256-bit hex",
              desc: "Bitcoin private keys are 256-bit hex numbers. Every hash is hex. Every block ID is hex. The whole chain is hex.",
              href: "/blockchain",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x02",
    title: "Down to the wire: binary, bitwise tricks, and IEEE 754",
    href: "/binary",
    label: "binary",
    variant: "magenta",
  },
};
