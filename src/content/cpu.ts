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

export const cpu: PageContent = {
  slug: "cpu",
  hexLabel: "0x05",
  category: "machine",
  hero: {
    eyebrow: "root.system / 0x05 / cpu",
    title: `Bits in a loop.<br><span class="highlight">A machine that runs.</span>`,
    lede: `You have <strong>bits</strong>, you have <strong>encodings</strong>, you have <strong>gates</strong>. Wire them into a circuit that fetches a bit pattern from memory, decides what it means, and acts on it. Then put that whole thing on a clock and let it loop. That's a CPU. This page builds one, conceptually, from the parts you already have.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Fetch, decode, **execute**",
      blocks: [
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
  nextUp: {
    eyebrow: "next up / 0x06",
    title: "Where state lives between cycles: memory",
    href: "/memory",
    label: "memory",
    variant: "magenta",
  },
};
