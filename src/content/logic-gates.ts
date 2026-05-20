import type { PageContent } from "@/types/content";

const rustAdder = `// Sum  = A ⊕ B ⊕ Cin
// Cout = (A·B) + (Cin·(A⊕B))
fn full_adder(a: u8, b: u8, cin: u8) -> (u8, u8) {
    let sum  = a ^ b ^ cin;
    let cout = (a & b) | (cin & (a ^ b));
    (sum, cout)
}

// chain 8 full adders to add two bytes
fn add_u8(a: u8, b: u8) -> u8 {
    let mut result = 0;
    let mut carry  = 0;
    for i in 0..8 {
        let ai = (a >> i) & 1;
        let bi = (b >> i) & 1;
        let (s, c) = full_adder(ai, bi, carry);
        result |= s << i;
        carry   = c;
    }
    result
}

fn main() {
    println!("{}", add_u8(23, 42)); // 65
}`;

const cAdder = `#include <stdio.h>
#include <stdint.h>

void full_adder(uint8_t a, uint8_t b, uint8_t cin,
                uint8_t *sum, uint8_t *cout) {
    *sum  = a ^ b ^ cin;
    *cout = (a & b) | (cin & (a ^ b));
}

uint8_t add_u8(uint8_t a, uint8_t b) {
    uint8_t result = 0, carry = 0;
    for (int i = 0; i < 8; i++) {
        uint8_t ai = (a >> i) & 1;
        uint8_t bi = (b >> i) & 1;
        uint8_t s, c;
        full_adder(ai, bi, carry, &s, &c);
        result |= s << i;
        carry   = c;
    }
    return result;
}

int main(void) {
    printf("%u\\n", add_u8(23, 42)); // 65
    return 0;
}`;

const rustSha = `// Three of the core functions inside SHA-256.
// Every operation is a gate you met on this page.
fn ch(e: u32, f: u32, g: u32) -> u32 {
    (e & f) ^ (!e & g)
    // AND gate, XOR gate, NOT gate
    // three gates, one function
    // 64 times per hash
    // billions of times per second
    // on every Bitcoin miner on Earth
}

fn maj(a: u32, b: u32, c: u32) -> u32 {
    (a & b) ^ (a & c) ^ (b & c)
    // majority vote across three bits
    // three AND gates, two XOR gates
}

fn rotr(x: u32, n: u32) -> u32 {
    x.rotate_right(n)
    // bit rotation
    // shifts bits around the 32-bit word
    // no new gate type needed
}`;

const cSha = `#include <stdint.h>

// The same three functions in C.
uint32_t ch(uint32_t e, uint32_t f, uint32_t g) {
    return (e & f) ^ (~e & g);
}

uint32_t maj(uint32_t a, uint32_t b, uint32_t c) {
    return (a & b) ^ (a & c) ^ (b & c);
}

uint32_t rotr(uint32_t x, uint32_t n) {
    return (x >> n) | (x << (32 - n));
}`;

export const logicGates: PageContent = {
  slug: "logic-gates",
  hexLabel: "0x04",
  category: "silicon",
  hero: {
    eyebrow: "root.system / 0x04 / silicon",
    title: `Where bits become<br><span class="highlight">physical.</span>`,
    lede: `You've seen bits as numbers and bits as letters. Now we go all the way down to the actual <strong>switches</strong> on a chip. A modern CPU has tens of billions of them. They do one thing: let current through, or don't. From that single trick, every program you've ever run is built.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The **transistor**: a switch you can write to",
      blocks: [
        {
          kind: "prose",
          html: `<p>In 1947, at Bell Labs in New Jersey, a physicist named William Shockley placed two gold foil contacts onto a sliver of germanium. He applied a small voltage. And for the first time in history, one electrical signal controlled another. He called it a <strong>transistor</strong>.</p>
<p>He had no idea he had just built the foundation of every computer, every phone, every blockchain, and every line of code ever written.</p>
<p>That single switch is still the only trick computing has ever used. Everything else is just how many of them you can wire together, and how fast you can make them switch.</p>`,
        },
        {
          kind: "prose",
          html: `<p>A <strong>transistor</strong> is a tiny three-terminal device. Two of the terminals carry current; the third controls whether that current flows. Apply a voltage to the control terminal and the circuit closes; current flows. Remove it and the circuit opens.</p>
<p>That's it. <em>That</em> is the foundation of computing. Every laptop, phone, satellite, and smart fridge is, at its core, a city of these switches connected to each other in just the right way. Map "current flowing" to <code>1</code> and "no current" to <code>0</code>, and you've bridged the physical world into the binary one you read about on the first page.</p>`,
        },
        { kind: "heading", text: "Two transistors → one logic gate" },
        {
          kind: "prose",
          html: `<p>Wire two transistors in series and you've made a circuit that outputs HIGH only when <em>both</em> inputs are HIGH. That's an AND gate. Wire them in parallel and the output goes HIGH when <em>either</em> is HIGH. That's OR. Add a single inverting transistor and you've got NOT. From those three, you can build everything else.</p>`,
        },
        { kind: "heading", text: "The four core gates" },
        { kind: "gates", gates: ["AND", "OR", "NOT", "XOR"] },
        { kind: "heading", text: "Try it: wire your own gate" },
        { kind: "widget", name: "gate-simulator" },
        {
          kind: "callout",
          variant: "info",
          title: "// remember from page 1?",
          body: `You met <code>&amp;</code>, <code>|</code>, <code>~</code>, and <code>^</code> as bitwise operators in code. Those operators <strong>are these gates</strong>. When your program runs <code>x &amp; y</code>, the CPU is literally feeding the bits of <code>x</code> and <code>y</code> into AND gates etched in silicon.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">When you write <code>x &amp; y</code> in Rust or C the compiler emits a single AND instruction. The CPU feeds the bits of <code>x</code> and <code>y</code> into AND gates etched into silicon. The same gates you just simulated above. <a href="/binary">← see: binary</a></p>`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Building an **adder** from gates",
      blocks: [
        {
          kind: "prose",
          html: `<p>Here's where it gets satisfying. Let's compose simple gates into something that does real work: <strong>add two numbers</strong>. The CPU's arithmetic unit is, at heart, a chain of these.</p>`,
        },
        { kind: "heading", text: "Half adder: 1 bit + 1 bit" },
        {
          kind: "prose",
          html: `<p>What does adding two bits look like?</p>`,
        },
        {
          kind: "table",
          headers: ["A", "B", "Sum", "Carry"],
          rows: [
            ["0", "0", "0", "0"],
            ["0", "1", "1", "0"],
            ["1", "0", "1", "0"],
            ["1", "1", "0", "1"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Look at the Sum column: it's exactly the XOR truth table. Look at the Carry column: it's exactly the AND truth table. So a half adder is just:</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block"><span style="color:var(--neon-cyan)">Sum</span>   = A <span style="color:var(--neon-magenta)">XOR</span> B<br><span style="color:var(--neon-cyan)">Carry</span> = A <span style="color:var(--neon-magenta)">AND</span> B</p>`,
        },
        { kind: "heading", text: "Full adder: 1 bit + 1 bit + carry-in" },
        {
          kind: "prose",
          html: `<p>To add multi-bit numbers, each bit position also accepts a carry from the position to its right. A full adder takes three inputs (A, B, Cin) and produces two outputs (Sum, Cout). It's two half adders glued together with an OR.</p>`,
        },
        { kind: "heading", text: "Simulating a full adder in code" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdder },
            c: { language: "c", code: cAdder },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// what just happened",
          body: `The function above is a faithful software simulation of the actual circuit running on every processor when you write <code>x + y</code>. Real CPUs use faster variants (carry-lookahead, Kogge-Stone) for speed, but the logic is identical.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The full adder above is a software simulation of the actual circuit in your CPU. When your CPU executes <code>ADD RAX, RBX</code> it is running this exact logic in hardware at four billion cycles per second. <a href="/cpu">← see: cpu</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "NAND universality, **CMOS** &amp; the modern chip",
      blocks: [
        { kind: "heading", text: "NAND is universal" },
        {
          kind: "prose",
          html: `<p>One of the most beautiful results in digital design: <strong>every Boolean function can be built from NAND gates alone</strong>. (Same for NOR.) NAND is a single gate that, by composition, gives you AND, OR, NOT, XOR, adders, multipliers, memory cells, and ultimately entire CPUs.</p>`,
        },
        { kind: "gates", gates: ["NAND", "NOR"] },
        {
          kind: "table",
          headers: ["built from NAND", "recipe"],
          rows: [
            ["NOT(A)", "NAND(A, A)"],
            ["AND(A, B)", "NOT(NAND(A, B))"],
            ["OR(A, B)", "NAND(NOT(A), NOT(B))"],
            ["XOR(A, B)", "NAND of three NANDs (4 gates total)"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Why does this matter in practice? Because manufacturing one type of gate is cheaper, more uniform, and easier to optimize. NAND-only design is a real strategy used in everything from flash memory to ASIC layout.</p>`,
        },
        { kind: "heading", text: "CMOS: how a real chip is wired" },
        {
          kind: "prose",
          html: `<p>Modern chips use <strong>CMOS</strong> (Complementary Metal-Oxide-Semiconductor), which pairs two transistor types: <em>NMOS</em> (conducts when its gate is HIGH) and <em>PMOS</em> (conducts when LOW). They're mirror images, and together they give you four critical properties:</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "property 01",
              value: "Low static power",
              desc: "In steady state, exactly one transistor in each pair is off, so there's no path from power to ground, and no leakage current.",
            },
            {
              label: "property 02",
              value: "Strong logic levels",
              desc: "Output is solidly pulled to either VDD or GND, not a wishy-washy in-between voltage.",
            },
            {
              label: "property 03",
              value: "Symmetric speed",
              desc: "Rise time and fall time are roughly equal, simplifying clock design.",
            },
            {
              label: "property 04",
              value: "Dense layout",
              desc: "A CMOS NAND gate uses 4 transistors total. Modern chips fit billions in a fingernail-sized die.",
            },
          ],
        },
        { kind: "heading", text: "Memory: when a circuit remembers" },
        {
          kind: "prose",
          html: `<p>So far every circuit we've discussed is <em>combinational</em>: output is a pure function of input. To make memory, you need <strong>feedback</strong>. Connect two NOR gates in a loop and you get an SR latch, a circuit with two stable states. Set it HIGH, it stays HIGH. Reset it, stays LOW. You've just built a 1-bit memory cell, the ancestor of every register, cache line, and DRAM cell.</p>
<p>Add a clock signal so the latch only updates on a rising edge, and you have a <strong>flip-flop</strong>. Stack 32 flip-flops side by side and that's a register. Stack thousands of registers and that's L1 cache. Pair logic + memory + a clock and that's a CPU.</p>`,
        },
        { kind: "heading", text: "The full stack, one picture" },
        {
          kind: "callout",
          variant: "info",
          title: "// from electron to executable",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li><strong>Electrons</strong> flow (or don't) through silicon doped with impurities.</li>
  <li>That flow is gated by a <strong>transistor</strong>, our atomic switch.</li>
  <li>A few transistors form a <strong>logic gate</strong> (NAND, NOR, XOR, …).</li>
  <li>Gates compose into <strong>adders, multiplexers, latches</strong>.</li>
  <li>Latches and ALUs compose into a <strong>CPU</strong> with registers and instructions.</li>
  <li>Instructions encode as <strong>bits</strong>, the binary you read about on page 1.</li>
  <li>Bits encode <strong>numbers, characters</strong> (page 2: ASCII), <strong>and code</strong>.</li>
  <li>And <em>that</em> is how a string like <code>"hello"</code> ends up flickering electrons in your CPU at 5 GHz.</li>
</ol>`,
        },
        { kind: "heading", text: "Gates in Bitcoin: SHA-256" },
        {
          kind: "prose",
          html: `<p>Every hash function you have ever used is built from logic gates. <strong>SHA-256</strong>, the algorithm that secures Bitcoin, performs 64 rounds of operations on its input data. Every single operation is one of these:</p>
<ul>
  <li><strong>AND gate</strong>: <code>(e &amp; f)</code></li>
  <li><strong>XOR gate</strong>: <code>(a ^ b)</code></li>
  <li><strong>NOT gate</strong>: <code>(~e)</code></li>
  <li><strong>Bit rotation</strong>: <code>x.rotate_right(n)</code></li>
  <li><strong>Bit shift</strong>: <code>x &gt;&gt; n</code></li>
</ul>
<p>The same five operations. The same gates you learned on this page. Running on the same transistors Shockley invented in 1947. Here is the heart of one SHA-256 round, in both languages:</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustSha },
            c: { language: "c", code: cSha },
          },
        },
        {
          kind: "prose",
          html: `<p>Bitcoin miners run SHA-256 billions of times per second, looking for a hash that starts with enough zeros. Every attempt is these three functions. Every function is AND, XOR, NOT, and shifts. Every operation is logic gates. Every gate is transistors. Every transistor is a switch.</p>
<p>From one switch in 1947 to a network securing hundreds of billions of dollars. One gate at a time.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">SHA-256 is 64 rounds of AND, XOR, NOT and bit rotations, the exact operations on this page, hashed into the 256-bit fingerprint that secures every Bitcoin block. <a href="/hashing">← see: hashing</a></p>`,
        },
        { kind: "heading", text: "Where to go from here" },
        {
          kind: "prose",
          html: `<p>You've now seen the entire vertical slice, from physical switching to high-level encoding. Natural next stops:</p>
<ul>
  <li><strong>Instruction set architectures</strong>, i.e. how bit patterns become operations (RISC-V is wonderfully clean).</li>
  <li><strong>Computer organization</strong>: pipelines, caches, branch prediction, how chips get fast.</li>
  <li><strong>FPGAs &amp; HDLs</strong>, where you write hardware in code with Verilog, Chisel, or SpinalHDL.</li>
  <li><strong>Build a CPU yourself</strong>: the <em>nand2tetris</em> course takes you from NAND gates to running a full OS.</li>
  <li><strong>Build SHA-256 from scratch</strong>: implement the full algorithm using only the AND, XOR, NOT, and shift operations from this page. Every line of code maps directly to a gate on a chip.</li>
</ul>
<p>The point isn't to know every layer in detail. The point is to know they're <em>there</em>, stacked on top of each other, all the way down to electrons.</p>`,
        },
        { kind: "heading", text: "Where logic gates appear in BitRoot" },
        {
          kind: "prose",
          html: `<p>This is the page everything else rests on. Every later topic reaches back to a gate somewhere:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x02 / binary",
              value: "Operators are gates",
              desc: "Bitwise operators in code are logic gates in hardware. & is AND, | is OR, ^ is XOR, ~ is NOT. When your program runs them, silicon switches fire.",
              href: "/binary",
            },
            {
              label: "0x03 / ascii",
              value: "Case toggle is one XOR",
              desc: "Uppercase to lowercase is a single XOR operation. 'A' ^ 0x20 = 'a'. One gate. One switch. The whole alphabet.",
              href: "/ascii",
            },
            {
              label: "0x05 / cpu",
              value: "Billions of gates, organised",
              desc: "A CPU is billions of logic gates organised to compute. The fetch-decode-execute cycle is gates switching in sequence at four billion times per second.",
              href: "/cpu",
            },
            {
              label: "0x06 / memory",
              value: "Gates that remember",
              desc: "An SR latch is two NOR gates in a feedback loop: a memory cell. Flip-flops are clocked latches; registers are flip-flops in parallel. Memory is gates remembering.",
              href: "/memory",
            },
            {
              label: "0x01 / number systems",
              value: "Gates only speak binary",
              desc: "Hex is how humans read binary; binary is how gates think. Every hex digit is four gate states. The translation is effortless because gates only speak binary.",
              href: "/number-systems",
            },
            {
              label: "0x0D / hashing",
              value: "SHA-256 is gates",
              desc: "SHA-256 is AND, XOR, NOT, and bit rotations: all logic gates, all built from transistors. The entire security of Bitcoin runs on gates you learned here.",
              href: "/hashing",
            },
            {
              label: "0x09 / pointers",
              value: "Addresses through gates",
              desc: "A memory address is a binary number; binary is gate states. When the CPU follows a pointer it feeds an address through logic gates to locate data in RAM.",
              href: "/pointers",
            },
            {
              label: "0x11 / blockchain",
              value: "Proof of work is gates",
              desc: "Bitcoin miners run SHA-256 billions of times per second. Every hash attempt is logic gates firing on silicon. Proof of work is computation; computation is gates; gates are transistors; transistors are switches.",
              href: "/blockchain",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x05",
    title: "Wire the gates into a machine that runs: how a CPU works",
    href: "/cpu",
    label: "cpu",
    variant: "magenta",
  },
};
