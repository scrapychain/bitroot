import type { PageContent } from "@/types/content";

const rustFetchDecode = `// A toy CPU with 4 registers and 6 ops.
// Each instruction is a single byte:
//   bits 7..5 = opcode (3 bits)
//   bits 4..3 = destination register (2 bits)
//   bits 2..0 = source register OR small immediate

const HALT: u8 = 0b000;
const LOAD: u8 = 0b001; // dst = imm
const MOV : u8 = 0b010; // dst = src
const ADD : u8 = 0b011; // dst = dst + src
const SUB : u8 = 0b100; // dst = dst - src
const PRT : u8 = 0b101; // print dst

fn run(program: &[u8]) {
    let mut reg = [0u8; 4];
    let mut pc  = 0usize;

    loop {
        // FETCH
        let ins = program[pc];
        pc += 1;

        // DECODE: pure bit-shifts, the same trick from page 1.
        let op  = (ins >> 5) & 0b111;
        let dst = ((ins >> 3) & 0b11) as usize;
        let src = (ins & 0b111) as usize;

        // EXECUTE
        match op {
            x if x == HALT => break,
            x if x == LOAD => reg[dst] = src as u8,
            x if x == MOV  => reg[dst] = reg[src & 0b11],
            x if x == ADD  => reg[dst] = reg[dst].wrapping_add(reg[src & 0b11]),
            x if x == SUB  => reg[dst] = reg[dst].wrapping_sub(reg[src & 0b11]),
            x if x == PRT  => println!("r{} = {}", dst, reg[dst]),
            _ => panic!("bad opcode"),
        }
    }
}

fn main() {
    // r0 = 5; r1 = 7; r0 = r0 + r1; print r0; halt
    let program = [
        0b001_00_101, // LOAD r0, 5
        0b001_01_111, // LOAD r1, 7
        0b011_00_001, // ADD  r0, r1
        0b101_00_000, // PRT  r0   → 12
        0b000_00_000, // HALT
    ];
    run(&program);
}`;

const cFetchDecode = `// Same toy CPU in C.
#include <stdio.h>
#include <stdint.h>

#define HALT 0
#define LOAD 1
#define MOV  2
#define ADD  3
#define SUB  4
#define PRT  5

void run(const uint8_t *program) {
    uint8_t reg[4] = {0};
    size_t pc = 0;

    for (;;) {
        // FETCH
        uint8_t ins = program[pc++];

        // DECODE
        uint8_t op  = (ins >> 5) & 0x7;
        uint8_t dst = (ins >> 3) & 0x3;
        uint8_t src = ins & 0x7;

        // EXECUTE
        switch (op) {
            case HALT: return;
            case LOAD: reg[dst] = src; break;
            case MOV : reg[dst] = reg[src & 0x3]; break;
            case ADD : reg[dst] += reg[src & 0x3]; break;
            case SUB : reg[dst] -= reg[src & 0x3]; break;
            case PRT : printf("r%u = %u\\n", dst, reg[dst]); break;
        }
    }
}

int main(void) {
    uint8_t program[] = {
        0b00100101, // LOAD r0, 5
        0b00101111, // LOAD r1, 7
        0b01100001, // ADD  r0, r1
        0b10100000, // PRT  r0   → 12
        0b00000000, // HALT
    };
    run(program);
    return 0;
}`;

const rustBranchPredict = `// The classic branch-prediction demo.
// Sorting the array makes the branch predictable, so the same
// loop runs ~3-6× faster on real hardware.
use std::time::Instant;

fn main() {
    let mut data: Vec<i32> = (0..32_768).map(|i| (i * 1103515245 + 12345) % 256).collect();

    // Run once UNSORTED, once SORTED.
    for label in ["unsorted", "sorted"] {
        if label == "sorted" { data.sort(); }

        let t = Instant::now();
        let mut sum: u64 = 0;
        for _ in 0..1_000 {
            for &x in &data {
                if x >= 128 {        // ← the unpredictable branch
                    sum += x as u64;
                }
            }
        }
        println!("{label:>9}: sum={sum}  in {:.2?}", t.elapsed());
    }
}`;

const cBranchPredict = `#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static int cmp(const void *a, const void *b) {
    return *(const int*)a - *(const int*)b;
}

int main(void) {
    enum { N = 32768 };
    int *data = malloc(N * sizeof *data);
    for (int i = 0; i < N; i++)
        data[i] = (int)((i * 1103515245u + 12345u) % 256u);

    for (int phase = 0; phase < 2; phase++) {
        if (phase == 1) qsort(data, N, sizeof *data, cmp);

        clock_t t = clock();
        unsigned long long sum = 0;
        for (int k = 0; k < 1000; k++)
            for (int i = 0; i < N; i++)
                if (data[i] >= 128)        // ← the unpredictable branch
                    sum += (unsigned)data[i];

        double secs = (double)(clock() - t) / CLOCKS_PER_SEC;
        printf("%s: sum=%llu  in %.2fs\\n",
               phase ? "  sorted" : "unsorted", sum, secs);
    }
    free(data);
    return 0;
}`;

const rustShaRound = `// One SHA-256 round: pure CPU operations
// on registers a through h.
fn sha256_round(
    a: u32, b: u32, c: u32, d: u32,
    e: u32, f: u32, g: u32, h: u32,
    k: u32, w: u32,
) -> (u32, u32, u32, u32, u32, u32, u32, u32) {
    // Every line below is an ALU operation.
    let s1 = e.rotate_right(6)
           ^ e.rotate_right(11)
           ^ e.rotate_right(25);

    let ch = (e & f) ^ (!e & g); // AND, XOR, NOT

    let temp1 = h
        .wrapping_add(s1)
        .wrapping_add(ch)
        .wrapping_add(k)
        .wrapping_add(w);

    let s0 = a.rotate_right(2)
           ^ a.rotate_right(13)
           ^ a.rotate_right(22);

    let maj = (a & b) ^ (a & c) ^ (b & c);

    let temp2 = s0.wrapping_add(maj);

    (
        temp1.wrapping_add(temp2), // new a
        a, b, c,
        d.wrapping_add(temp1),     // new e
        e, f, g,
    )
}`;

const cShaRound = `#include <stdint.h>

static inline uint32_t rotr(uint32_t x, int n) {
    return (x >> n) | (x << (32 - n));
}

void sha256_round(
    uint32_t *a, uint32_t *b,
    uint32_t *c, uint32_t *d,
    uint32_t *e, uint32_t *f,
    uint32_t *g, uint32_t *h,
    uint32_t k,  uint32_t w
) {
    uint32_t s1  = rotr(*e,6) ^ rotr(*e,11) ^ rotr(*e,25);
    uint32_t ch  = (*e & *f) ^ (~*e & *g);
    uint32_t t1  = *h + s1 + ch + k + w;
    uint32_t s0  = rotr(*a,2) ^ rotr(*a,13) ^ rotr(*a,22);
    uint32_t maj = (*a & *b) ^ (*a & *c) ^ (*b & *c);
    uint32_t t2  = s0 + maj;

    *h = *g; *g = *f; *f = *e;
    *e = *d + t1;
    *d = *c; *c = *b; *b = *a;
    *a = t1 + t2;
}`;

export const cpu: PageContent = {
  slug: "cpu",
  hexLabel: "0x05",
  category: "machine",
  hero: {
    eyebrow: "root.system / 0x05 / cpu",
    title: `Bits in a loop.<br><span class="highlight">A machine that runs.</span>`,
    lede: `You have <strong>bits</strong>, you have <strong>encodings</strong>, you have <strong>gates</strong>. Wire them into a circuit that fetches a bit pattern from memory, decides what it means, and acts on it. Then put that whole thing on a clock and let it loop. That's a CPU. This page builds one, conceptually, from the parts you already have.`,
    narrativeHtml: `<p>Right now, inside your machine, something is running a loop.</p>
<p>It hasnt stopped since you pressed the power button.</p>
<p>It wont stop until you shut down.</p>
<p>Billions of times a second, the same three steps, over and over, no rest and no variation.</p>
<p>Fetch. Decode. Execute.</p>
<p>You think your CPU is doing a thousand things at once. Running your browser. Playing music. Checking for updates. It feels like juggling.</p>
<p>It isnt.</p>
<p>Your CPU has exactly one job. Grab the next instruction. Work out what it means. Do it. Then grab the next one. The illusion of doing everything comes from doing this one thing fast enough that you cant see the seams.</p>
<p>On page four you built logic gates out of transistors. AND, OR, NOT, XOR. Tiny circuits that compute.</p>
<p>A CPU is what happens when you wire those gates into a loop and put them on a clock.</p>
<p>Thats it. Thats the entire machine.</p>
<p>The bits from page two are the instructions. The gates from page four do the work. The clock makes it all move forward.</p>
<p>Everything your computer has ever done, every frame, every keystroke, every transaction it has ever checked, is this one loop, turning.</p>
<p>It has been turning the whole time youve been reading this.</p>
<p>Lets watch it turn.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Fetch, decode, **execute**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Your CPU has one job. One. It reads an instruction, it executes it, it moves to the next one. That is the entire CPU.</p>
<p>But here is what nobody tells you about that one job. That instruction is not English. It is not Python. It is not even assembly. It is this: <code>10110000 01100001</code>. Raw binary. Two bytes. Sixteen switches, on and off.</p>
<p>Your CPU reads those 16 bits, decodes them through logic gates, and in a single clock tick executes the operation they describe. Do you see what is happening? Everything connects. Transistors built the logic gates. Logic gates built the circuits. Circuits decode the binary. Binary carries the instruction. The instruction changes the state.</p>
<p>All of that, in one clock cycle, at four billion cycles per second. And it has been doing this since the moment you powered on. Without stopping. Without resting. Without ever asking what it all means.</p>`,
        },
        {
          kind: "prose",
          html: `<p>A CPU has exactly one job: it sits in a loop. Each tick of its clock, it does three things:</p>
<ol>
  <li><strong>Fetch</strong> the next instruction (a bit pattern) from memory.</li>
  <li><strong>Decode</strong> it: figure out what those bits mean.</li>
  <li><strong>Execute</strong> the operation, possibly updating memory or a register.</li>
</ol>
<p>That's the whole machine. Every program (your browser, this page, the OS scheduler) is a sequence of those instructions, fetched one by one, billions of times a second.</p>`,
        },
        { kind: "heading", text: "What's an instruction?" },
        {
          kind: "prose",
          html: `<p>An instruction is just a <strong>byte</strong> (or a few bytes) where different bits mean different things. Same logic as the ASCII table on page 2, except instead of "this byte is the letter A," the convention is "this byte is the operation ADD, on registers 0 and 1."</p>
<p>A real x86 instruction can be 1 to 15 bytes; RISC-V is a clean 4 bytes; ARM Thumb is 2. They all share the same shape: <em>opcode + operands</em>, packed into bits.</p>`,
        },
        { kind: "heading", text: "Step through a program" },
        { kind: "widget", name: "fetch-decode-execute" },
        {
          kind: "raw",
          html: `<p class="connection-line">Decoding an instruction is just bit shifts and masks, the same bitwise operators from the binary page. <code>(ins &gt;&gt; 5) &amp; 0b111</code> extracts the opcode; <code>(ins &gt;&gt; 3) &amp; 0b11</code> extracts the register. The CPU reads instructions exactly the way you learned to read bits. <a href="/binary">← see: binary</a></p>`,
        },
        {
          kind: "table",
          headers: ["bits", "field", "meaning"],
          rows: [
            ["7..5", "opcode", "<code>011</code> = ADD, <code>001</code> = LOAD, …"],
            ["4..3", "dest reg", "which register receives the result"],
            ["2..0", "src reg / immediate", "the other operand"],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// remember from page 1?",
          body: `Decoding an instruction is just <strong>bit shifts and masks</strong>: exactly the bitwise operators from the binary page. The CPU pulls fields out of a byte the same way you tested individual bits in <code>(x &gt;&gt; 3) &amp; 1</code>.`,
        },
        { kind: "heading", text: "A 6-instruction CPU you can read in 5 minutes" },
        {
          kind: "prose",
          html: `<p>Here's a complete software simulation of a tiny CPU. It has 4 registers, 6 opcodes, and a single byte per instruction. The whole loop fits on one screen, and every concept is real. Every line maps to something a real chip does.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustFetchDecode },
            c: { language: "c", code: cFetchDecode },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// takeaway",
          body: `The fetch-decode-execute loop is the entire machine. Every other CPU feature (caches, pipelines, predictors) is just an optimization on top of those three steps.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Registers, ALU, **control unit**: the parts of a CPU",
      blocks: [
        {
          kind: "prose",
          html: `<p>Open up the toy simulator above and ask: where does that loop live in <em>silicon</em>? Each piece maps to a physical block of gates from the previous page.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "block 01",
              value: "Registers",
              desc: "A bank of flip-flops, exactly the SR-latch + clock circuits from the logic-gates page. 32 flip-flops side by side = one 32-bit register.",
            },
            {
              label: "block 02",
              value: "ALU",
              desc: "The arithmetic-logic unit. The full adder you built from XOR + AND + OR is right here, repeated 32 times for a 32-bit add.",
            },
            {
              label: "block 03",
              value: "Control unit",
              desc: "Reads the opcode field and decides which wires to enable. Pure combinational logic: a tree of NAND gates routing bits to the right block.",
            },
            {
              label: "block 04",
              value: "Program counter",
              desc: "A register that holds the address of the next instruction. After each fetch, an adder bumps it by the instruction size.",
            },
          ],
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The ALU is the full adder you built on the logic gates page, repeated 64 times side by side for a 64-bit processor. Every ADD instruction your program executes is those XOR and AND gates firing in sequence. <a href="/logic-gates">← see: logic gates</a></p>`,
        },
        { kind: "heading", text: "The clock: what makes it all step forward" },
        {
          kind: "prose",
          html: `<p>A CPU is a sea of combinational gates plus banks of flip-flops. Combinational gates have no memory; their output is a pure function of input. So nothing changes on its own. What drives the loop forward is the <strong>clock</strong>: a square-wave signal toggling at a fixed rate (3 GHz = 3 billion times a second). On every <em>rising edge</em>, the flip-flops latch their inputs and the next state begins.</p>
<p>"Faster CPU" mostly means "shorter clock period," which only works if every signal can propagate through every gate before the next tick. Get that wrong and you read garbage out of the latches.</p>`,
        },
        { kind: "heading", text: "Memory: where the program actually lives" },
        {
          kind: "prose",
          html: `<p>Registers are tiny and fast (a few hundred bytes, accessed in 1 cycle). Real programs need more, gigabytes more. So the CPU is wired to a separate chip called <strong>RAM</strong>, addressed by a number. Each instruction fetch is really:</p>`,
        },
        {
          kind: "diagram",
          name: "fetch-execute-flow",
        },
        {
          kind: "prose",
          html: `<p>Compared to a register access, RAM is <em>slow</em>. Hundreds of cycles. The whole subject of computer architecture is, mostly, about hiding that latency.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Every value the CPU reads from memory is binary bytes at an address. That address is a hex number, <code>0x7fff5fbff8a4</code>, a pointer: a number that means somewhere. The CPU follows millions of these every second. <a href="/pointers">← see: pointers</a></p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the loop, restated",
          body: `<strong>PC</strong> tells RAM which bits to send. The <strong>control unit</strong> decodes them. The <strong>ALU</strong> crunches numbers. The <strong>registers</strong> remember results. The <strong>clock</strong> keeps everything in lockstep. That's it. That's a CPU.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Pipelining, caches &amp; **branch prediction**",
      blocks: [
        { kind: "heading", text: "Why a 3 GHz CPU runs more than 3 billion ops/s" },
        {
          kind: "prose",
          html: `<p>Naively, fetch-decode-execute takes at least three clock cycles per instruction. So a 3 GHz CPU should top out at 1 billion instructions per second. In practice, modern CPUs sustain <em>several</em> instructions per cycle. How?</p>`,
        },
        { kind: "heading", text: "Pipelining: an assembly line for instructions" },
        {
          kind: "prose",
          html: `<p>The trick: while instruction <em>N</em> is executing, instruction <em>N+1</em> can be decoding, and <em>N+2</em> can be fetching. Each pipeline stage runs in parallel, like a factory assembly line. A 5-stage pipeline finishes (ideally) one instruction per cycle.</p>
<p>Real CPUs go further. Modern x86 cores have 14 to 20 pipeline stages and issue 4+ instructions per cycle (<em>superscalar</em>, with multiple ALUs).</p>`,
        },
        { kind: "heading", text: "Caches: bridging the RAM gap" },
        {
          kind: "prose",
          html: `<p>RAM is far away (electrically) and slow (hundreds of cycles). To hide that, the CPU keeps recently-used bytes in small, fast SRAM banks right next to the cores: <strong>caches</strong>. Most programs touch the same bytes repeatedly, so this works extraordinarily well.</p>`,
        },
        {
          kind: "table",
          headers: ["level", "size", "latency", "where"],
          rows: [
            ["L1", "32-64 KB", "~4 cycles", "per-core, split into instruction and data"],
            ["L2", "256 KB to 1 MB", "~12 cycles", "per-core"],
            ["L3", "8-64 MB", "~40 cycles", "shared between cores"],
            ["RAM", "GBs", "~200+ cycles", "off-chip"],
          ],
        },
        {
          kind: "prose",
          html: `<p>This is why <strong>cache-friendly code</strong> matters. A linear walk over an array hits L1 on every access. A pointer-chase through a linked list, where every node sits in a different cache line, pays the full RAM tax. Same algorithmic complexity, 50× difference in wall time.</p>`,
        },
        { kind: "heading", text: "Branch prediction" },
        {
          kind: "prose",
          html: `<p>Pipelining fights one big enemy: the <strong>branch</strong>. When the CPU hits an <code>if</code>, it doesn't yet know which way to go, but the pipeline needs to keep fetching <em>something</em>. So the CPU <em>guesses</em>, using a tiny on-chip lookup table that tracks the recent history of every branch. Right guess: full speed. Wrong guess: flush the pipeline and start over (10 to 20 cycle penalty).</p>
<p>Modern predictors hit 95%+. They're so good that <em>data layout</em> can change performance dramatically. Sort an array first, and the same hot loop runs several times faster, because the same branch now goes the same way for many iterations in a row.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBranchPredict },
            c: { language: "c", code: cBranchPredict },
          },
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the famous side channel",
          body: `Branch prediction speculates ahead, and the speculative path leaves traces in the cache even when it's discarded. That's <strong>Spectre</strong>: a 2018 vulnerability that turned a performance optimization into a way to read protected memory. Every CPU shipped before mid-2018 was affected. Mitigations cost real performance.`,
        },
        { kind: "heading", text: "The CPU inside Bitcoin miners" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin miner on Earth is a CPU running one function, over and over, as fast as possible, forever. That function is <strong>SHA-256</strong>. And SHA-256 is pure CPU work. Here is what a miner is actually computing, one round of the 64 that make up a single hash:</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustShaRound },
            c: { language: "c", code: cShaRound },
          },
        },
        {
          kind: "prose",
          html: `<p>Every operation in those functions is a single CPU instruction:</p>
<ul>
  <li><code>rotate_right</code> / <code>rotr</code>: a barrel shifter in the ALU.</li>
  <li><code>&amp;</code>, <code>^</code>, <code>!</code>: AND, XOR, NOT gates firing.</li>
  <li><code>wrapping_add</code>: the full adder circuit from the logic gates page.</li>
</ul>
<p>SHA-256 runs 64 of these rounds per hash attempt. Bitcoin miners attempt trillions of hashes. Each attempt is 64 rounds; each round is dozens of ALU operations; each ALU operation is logic gates; each gate is transistors. A modern Bitcoin ASIC runs tens of trillions of SHA-256 hashes per second.</p>
<p>All of it is the fetch-decode-execute loop you learned on this page, running as fast as physics allows. This is what secures hundreds of billions of dollars. Not cryptographic magic. Not financial engineering. Just a CPU, doing one job, very very fast.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">SHA-256 is a CPU workload: 64 rounds of rotations, AND, XOR, NOT, and additions per hash, run trillions of times per second by mining hardware to find a hash with enough leading zeros. <a href="/hashing">← see: hashing</a></p>`,
        },
        { kind: "heading", text: "The full stack, again" },
        {
          kind: "callout",
          variant: "info",
          title: "// from electron to executable, with the loop on top",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li>Electrons gated by <strong>transistors</strong> form <strong>logic gates</strong>.</li>
  <li>Gates form <strong>adders, latches, multiplexers</strong>.</li>
  <li>Those compose into <strong>registers, ALUs, control units</strong>.</li>
  <li>A <strong>clock</strong> drives them through fetch-decode-execute.</li>
  <li>Bits in memory encode <strong>instructions</strong> (this page) and <strong>data</strong>.</li>
  <li>Data bits encode <strong>numbers</strong> (page 1) and <strong>characters</strong> (page 2).</li>
  <li>Sequences of instructions become a <strong>program</strong>.</li>
  <li>Run a few billion of them per second and you get the experience of using a computer.</li>
</ol>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>You've seen the whole stack now. Natural deep-dives:</p>
<ul>
  <li><strong>RISC-V</strong>: a clean, open ISA you can read in an afternoon.</li>
  <li><strong>nand2tetris</strong>: build a CPU from NAND gates and run software on it.</li>
  <li><strong>Agner Fog's microarchitecture manuals</strong>, the canonical reference on how real x86 cores actually work.</li>
  <li><strong>Compiler Explorer (godbolt.org)</strong>: see what bytes your high-level code actually becomes.</li>
</ul>`,
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "logic-gates",
        text: `The CPU is millions of logic gates wired into a machine. The ALU is the adder from the gates page. Every instruction is gates switching.`,
      },
      {
        slug: "binary",
        text: `Instructions, addresses, and data are all binary, and decoding an instruction is bit shifts and masks. The CPU runs on the binary page, clocked billions of times a second.`,
      },
      {
        slug: "memory",
        text: `The CPU does nothing without memory. It fetches instructions and data by address, and caches hide the latency. Stack and heap from the memory page are where it reads and writes.`,
      },
      {
        slug: "operating-system",
        text: `The OS decides which program gets the CPU and when. Kernel mode, interrupts, and context switches all sit on top of the fetch-decode-execute loop on this page.`,
      },
      {
        slug: "pointers",
        text: `The program counter is a pointer: a number naming the next instruction's address. The CPU spends its life following pointers through memory.`,
      },
      {
        slug: "compile-vs-runtime",
        text: `The compiler turns your code into the exact instructions this page executes. Compile time produces them; the CPU is runtime. The boundary on that page is this CPU's front door.`,
      },
      {
        slug: "variables",
        text: `A variable in a register is the fastest variable there is. The CPU page is where <code>let x = 42</code> finally becomes a value the silicon holds.`,
      },
      {
        slug: "hashing",
        text: `SHA-256 is so common that CPUs ship dedicated instructions for it (SHA-NI, ARMv8 Crypto). Each round is one trip through the fetch-decode-execute loop on this page.`,
      },
      {
        slug: "number-systems",
        text: `Instruction addresses are hex, register values binary, immediates decimal in source: the same number in three masks. The number systems page is the CPU's notation.`,
      },
      {
        slug: "ascii",
        text: `The CPU processes a character as its ASCII integer, <code>72</code> for H, with no idea it is a letter. The ASCII page is the meaning the silicon never sees.`,
      },
      {
        slug: "networking",
        text: `Your network card runs its own fetch-decode-execute loop alongside the main CPU, two processors sharing one machine. The networking page has a CPU of its own.`,
      },
      {
        slug: "blockchain",
        text: `Mining is the fetch-decode-execute loop pushed to its physical limit: an ASIC runs SHA-256 trillions of times a second. The blockchain page is why mining costs electricity.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x06",
    title: "Where state lives between cycles: memory",
    href: "/memory",
    label: "memory",
    variant: "magenta",
  },
};
