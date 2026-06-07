import type { PageContent } from "@/types/content";

const rustErrors = `// Two errors. Same program structure. Different phases.
fn main() {
    // (1) COMPILE-TIME ERROR. Uncomment and the build fails:
    //
    //   let n: u32 = "forty-two";
    //
    //     error[E0308]: mismatched types
    //       expected \`u32\`, found \`&str\`
    //
    // No binary is produced. The bug never reaches a user.

    // (2) RUNTIME ERROR. Compiles fine. Crashes when the program
    //     actually runs and the value of \`i\` is finally known.
    let arr = [10, 20, 30];
    let i = std::env::args().count();   // depends on how it's invoked
    println!("{}", arr[i]);             // panic if i >= 3
}`;

const cErrors = `#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    // (1) COMPILE-TIME ERROR. Uncomment and clang/gcc rejects it:
    //
    //   int n = "forty-two";
    //
    //     error: incompatible pointer to integer conversion
    //
    // No binary is produced. The bug never reaches a user.

    // (2) RUNTIME ERROR. Compiles fine. Reads garbage or crashes,
    //     depending on what's adjacent in memory at run time.
    int arr[] = {10, 20, 30};
    int i = atoi(argv[1]);    // value is unknown until launch
    printf("%d\\n", arr[i]);   // undefined behaviour if i is OOB
    return 0;
}`;

const rustConst = `// \`const fn\` lets the compiler run the function at build time.
// The result becomes a baked-in constant, computed once, ever.
const fn factorial(n: u32) -> u64 {
    let mut acc: u64 = 1;
    let mut i: u32 = 1;
    while i <= n {
        acc *= i as u64;
        i += 1;
    }
    acc
}

// FACT_10 is computed while the compiler is running on your laptop.
// At runtime, this is just \`mov eax, 3628800\`. No loop. No work.
const FACT_10: u64 = factorial(10);

fn main() {
    println!("baked at compile time: {FACT_10}");

    // Same function, called with a value from the world.
    // The compiler can't know it, so the loop runs at runtime.
    let n: u32 = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);
    println!("computed at runtime:   {}", factorial(n));
}`;

const cConst = `#include <stdio.h>
#include <stdlib.h>

// C has no general "run this function at compile time" feature, but
// constant expressions and the preprocessor cover the simple cases.
// Most compilers will fold this whole expression into a single number.
enum {
    FACT_10 = 1*2*3*4*5*6*7*8*9*10   // 3628800, computed at compile time
};

unsigned long long factorial(unsigned n) {
    unsigned long long acc = 1;
    for (unsigned i = 1; i <= n; i++) acc *= i;
    return acc;
}

int main(int argc, char **argv) {
    printf("baked at compile time: %d\\n", FACT_10);

    unsigned n = argc > 1 ? (unsigned)atoi(argv[1]) : 10;
    printf("computed at runtime:   %llu\\n", factorial(n));
    return 0;
}`;

const rustDispatch = `// STATIC dispatch (compile time): the compiler stamps out one
// version of \`area\` for every concrete shape that calls it.
// Each call is a direct jump to a known function.
trait Shape { fn area(&self) -> f64; }
struct Circle { r: f64 }
struct Square { side: f64 }
impl Shape for Circle { fn area(&self) -> f64 { 3.14159 * self.r * self.r } }
impl Shape for Square { fn area(&self) -> f64 { self.side * self.side } }

fn area_static<S: Shape>(s: &S) -> f64 { s.area() }   // resolved at build

// DYNAMIC dispatch (runtime): one copy of \`area_dyn\`. At runtime,
// each call follows a vtable pointer to figure out which method to run.
fn area_dyn(s: &dyn Shape) -> f64 { s.area() }        // resolved at run

fn main() {
    let c = Circle { r: 1.0 };
    let s = Square { side: 1.0 };

    // The compiler emits two area_static specialisations.
    // Each call below is as fast as a direct function call.
    println!("{}", area_static(&c));
    println!("{}", area_static(&s));

    // One area_dyn function, two indirect calls. A few cycles slower
    // per call, but only one binary copy of the code.
    let shapes: Vec<&dyn Shape> = vec![&c, &s];
    for s in &shapes {
        println!("{}", area_dyn(*s));
    }
}`;

const cDispatch = `// STATIC dispatch: direct function calls, resolved by the linker.
#include <stdio.h>

double circle_area(double r)    { return 3.14159 * r * r; }
double square_area(double side) { return side * side; }

// DYNAMIC dispatch: function pointers. The address of the function
// to call is decided at runtime, by reading the pointer.
typedef double (*area_fn)(void *self);

typedef struct { double r; }    Circle;
typedef struct { double side; } Square;

double circle_area_fn(void *self) { return circle_area(((Circle*)self)->r); }
double square_area_fn(void *self) { return square_area(((Square*)self)->side); }

typedef struct { void *self; area_fn area; } Shape;

int main(void) {
    Circle c = { 1.0 };
    Square s = { 1.0 };

    // Static: the linker hard-wires the call. No indirection.
    printf("%f\\n", circle_area(c.r));
    printf("%f\\n", square_area(s.side));

    // Dynamic: the call goes through a pointer. Cheap, but the
    // CPU's branch predictor has to guess the target every call.
    Shape shapes[] = {
        { &c, circle_area_fn },
        { &s, square_area_fn },
    };
    for (int i = 0; i < 2; i++)
        printf("%f\\n", shapes[i].area(shapes[i].self));
    return 0;
}`;

const cConsensus = `/* Bitcoin consensus constants -
 * compile-time, never runtime variables */
#define MAX_BLOCK_WEIGHT     4000000UL
#define COIN                 100000000ULL /* 1 BTC in satoshis */
#define MAX_MONEY            (21000000ULL * COIN)
#define COINBASE_MATURITY    100
#define WITNESS_SCALE_FACTOR 4

/* These are evaluated at compile time.
 * No runtime branch. No configuration file.
 * If you change these you change Bitcoin.
 * You are now on a different blockchain. */

static_assert(MAX_MONEY == 2100000000000000ULL,
    "MAX_MONEY must equal 21 million BTC in satoshis");`;

const rustConsensus = `/* Same constants in Rust -
 * const values evaluated at compile time */
const MAX_BLOCK_WEIGHT: u32     = 4_000_000;
const COIN: u64                 = 100_000_000;
const MAX_MONEY: u64            = 21_000_000 * COIN;
const COINBASE_MATURITY: u32    = 100;
const WITNESS_SCALE_FACTOR: u32 = 4;

/* Compile-time assertion: catches
 * any accidental change to the cap */
const _: () = assert!(
    MAX_MONEY == 2_100_000_000_000_000,
    "MAX_MONEY must equal exactly 21 million BTC"
);

/* These compile-time constants define
 * what it means to be a Bitcoin node.
 * Not configuration. Not parameters.
 * The protocol itself. */`;

const cValidate = `typedef struct {
    uint32_t version;
    uint8_t  prev_hash[32];
    uint8_t  merkle_root[32];
    uint32_t timestamp;
    uint32_t bits;
    uint32_t nonce;
} BlockHeader;

/* Runtime validation: called when a
 * new block arrives over the network */
int validate_block(const BlockHeader *header,
                   const uint8_t *txdata,
                   size_t txdata_len)
{
    /* 1. Check proof of work (runtime) */
    uint8_t hash[32];
    double_sha256((uint8_t*)header,
                  sizeof *header, hash);
    if (!meets_target(hash, header->bits))
        return 0; /* rejected at runtime */

    /* 2. Check block weight (runtime) */
    uint32_t weight = compute_weight(txdata,
                                     txdata_len);
    if (weight > MAX_BLOCK_WEIGHT) /* compile-time const */
        return 0; /* runtime check vs compile constant */

    /* 3. Validate all transactions (runtime) */
    return validate_transactions(txdata, txdata_len);
}`;

const rustValidate = `fn validate_block(
    header: &BlockHeader,
    transactions: &[Transaction],
) -> Result<(), ValidationError> {

    // Runtime: hash this specific block
    let hash = double_sha256(header);

    // Runtime check against compile-time target
    if !hash.meets_difficulty_target(header.bits) {
        return Err(ValidationError::InsufficientWork);
    }

    // Runtime check against compile-time constant
    let weight: u32 = transactions.iter()
        .map(|tx| tx.weight())
        .sum();

    if weight > MAX_BLOCK_WEIGHT { // compile-time const
        return Err(ValidationError::BlockTooHeavy);
    }

    // Runtime: verify every signature
    for tx in transactions {
        tx.verify_signatures()?;
    }

    Ok(())
}

/* The split is clean:
 *   What IS a valid Bitcoin block: compile time.
 *   Whether THIS block IS valid:   runtime.
 *
 * Change the compile-time rules and you fork Bitcoin.
 * Every node on the old binary rejects your blocks.
 * That is what a hard fork is: changing compile-time
 * consensus rules in a way old binaries reject. */`;

export const compileVsRuntime: PageContent = {
  slug: "compile-vs-runtime",
  hexLabel: "0x0A",
  category: "time",
  hero: {
    eyebrow: "root.system / 0x0A / time",
    title: `Two phases.<br><span class="highlight">One program.</span>`,
    lede: `Every line you write happens twice. Once when the compiler reads it and turns it into a binary, and again, in a different shape, when the CPU actually runs it. The first phase is <strong>compile time</strong>. The second is <strong>runtime</strong>. Almost every tradeoff in programming, from type systems to performance to safety, comes down to where the work happens.`,
    narrativeHtml: `<p>Two moments define every program ever written.</p>
<p>The moment it was built.<br>And the moment it ran.</p>
<p>Most developers blur them together. They think of their code as one continuous thing, from source file to running process. One flow.</p>
<p>It is not.</p>
<p>It is two completely separate phases. With different rules. Different capabilities. Different failure modes. Different costs.</p>
<p>A bug caught at compile time costs you ten minutes.</p>
<p>A bug caught at runtime costs you a crashed server.</p>
<p>A bug caught at runtime in production costs you your users.</p>
<p>A bug caught at runtime in a deployed smart contract on Ethereum costs you everything. The money is already gone. The transaction cannot be reversed.</p>
<p>This is not a minor distinction.</p>
<p>The line between compile time and runtime is the single most important decision in programming language design.</p>
<p>And once you see it, you see it in every language. In every system. In every layer of this curriculum.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What's the **difference**?",
      blocks: [
        {
          kind: "prose",
          html: `<p>The compiler turns source code into a binary. That phase is called <strong>compile time</strong>, and it happens once, on a developer's machine, before anything ships.</p>
<p>When someone runs the binary, the OS loads it into memory and the CPU starts executing instructions. That phase is <strong>runtime</strong>, and it happens every time the program runs.</p>
<p>The same line of source can produce errors in either phase. Which phase it lands in determines who suffers. A compile-time error stays on your laptop. A runtime error reaches a user, possibly at 2 AM, possibly with their data in transit.</p>`,
        },
        { kind: "heading", text: "Two errors, two phases" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustErrors },
            c: { language: "c", code: cErrors },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the rule of thumb",
          body: `A <strong>compile-time error</strong> is the compiler refusing to build the binary at all. A <strong>runtime error</strong> is the binary running and then misbehaving (panicking, crashing, returning the wrong answer, or, in C, silently corrupting memory). The first kind is cheap; the second kind is expensive.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">A compile-time error produces no binary. No binary means no machine code. No machine code means the CPU never runs a single instruction from it. The fetch-decode-execute loop you learned on page 5 never starts. The bug is stopped before silicon. <a href="/cpu">← see: CPU</a> · <a href="/binary">Binary</a></p>`,
        },
        { kind: "heading", text: "What about an interpreter?" },
        {
          kind: "prose",
          html: `<p>A pure interpreter (Python, Ruby, Bash) skips the up-front compile step. It reads source code and executes it directly. There's still a parse phase that runs before execution, but it happens on the user's machine, every time the program runs. So a typo that a Rust or C compiler catches before shipping shows up in Python only when the line is actually reached at runtime.</p>
<p>This is the same compile/runtime split, drawn at a different point. Less compile-time work means more runtime risk.</p>`,
        },
        { kind: "heading", text: "Which phase? You decide." },
        { kind: "widget", name: "phase-classifier" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "What gets **decided** when?",
      blocks: [
        {
          kind: "prose",
          html: `<p>Some things have to wait for runtime: user input, network responses, file contents, the current time, random numbers. Anything that depends on the world.</p>
<p>But a surprising amount of work <em>can</em> be done at compile time, if the language lets the compiler do it. The trend in modern systems languages is to push more and more decisions earlier, because:</p>
<ol>
  <li><strong>Compile-time checks catch bugs before users see them.</strong> Every type error caught by the compiler is a runtime crash that never happened.</li>
  <li><strong>Compile-time computation is free at runtime.</strong> The work already happened on the developer's machine.</li>
  <li><strong>Compile-time-known sizes and types let the compiler pick efficient code.</strong> Stack-allocated, inlined, and specialised paths only work when the shape is fixed before the program runs.</li>
</ol>`,
        },
        {
          kind: "table",
          headers: ["question", "compile time", "runtime"],
          rows: [
            ["What's the type of <code>x</code>?", "Yes (Rust, C, Java, Go)", "Yes (Python, Ruby, JS)"],
            ["What's the size of <code>x</code>?", "If it's a primitive or fixed array", "If it's <code>Vec</code>, <code>String</code>, <code>malloc</code>'d"],
            ["Where does <code>x</code> live in memory?", "Stack offsets, static addresses", "Heap allocations"],
            ["Which function does <code>foo()</code> call?", "Direct calls, generics", "Function pointers, vtables"],
            ["What's <code>10 * 60 * 60</code>?", "Constant folded into <code>36000</code>", "Recomputed every call"],
            ["What's <code>read_user_input()</code>?", "Can't know", "Whatever the user typed"],
          ],
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Look at the memory row in that table. Stack offsets are compile time. Heap allocations are runtime. The variables page showed exactly this split: fixed-size types go on the stack because the compiler knows their size; dynamic types go on the heap because only runtime knows how big they are. Compile vs runtime is the reason stack and heap exist at all. <a href="/variables">← see: Variables</a> · <a href="/memory">Memory</a></p>`,
        },
        { kind: "heading", text: "Computing things at compile time" },
        {
          kind: "prose",
          html: `<p>Most languages now let you tell the compiler "run this for me, please, while you're building." Rust calls these <code>const fn</code>. C++ has <code>constexpr</code>. C has constant expressions and the preprocessor. The result is the same in every case: the value gets baked into the binary, and there's literally nothing for the CPU to compute when the program runs.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustConst },
            c: { language: "c", code: cConst },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the line is movable",
          body: `A C compiler doing constant folding moves arithmetic from runtime to compile time. A Rust compiler doing trait specialisation moves dispatch from runtime to compile time. A type system moves "is this operation valid?" from runtime ("would have crashed") to compile time ("won't compile"). Every modern compiler is, in part, a machine for moving work earlier.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The OS row in the table shows static linking as compile time, dynamic linking as runtime. When Bitcoin Core starts it dynamically links to libssl and libc. Those addresses are resolved at runtime by the dynamic linker. The OS page showed how program startup works. This is the compile vs runtime split inside the loader itself. <a href="/operating-system">← see: Operating System</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Why this ties to **every other page**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Look back at every layer this site has covered. Each one has a compile-time / runtime split somewhere, and once you see the pattern it shows up everywhere.</p>`,
        },
        {
          kind: "table",
          headers: ["layer", "compile time", "runtime"],
          rows: [
            [
              "Number systems",
              "<code>0xCAFEBABE</code> is parsed and stored as bytes",
              "Bytes are loaded and used; the prefix is gone",
            ],
            [
              "Binary",
              "Instructions encoded into byte patterns",
              "CPU decodes and executes them",
            ],
            [
              "ASCII",
              "<code>\"hello\"</code> baked into <code>rodata</code>",
              "Bytes loaded, sent to a file descriptor, drawn",
            ],
            [
              "Logic gates",
              "Gate layout fixed at fab time (the chip's compile)",
              "Current flows through that fixed structure",
            ],
            [
              "CPU",
              "ISA: which bit patterns mean which operations",
              "CPU runs the patterns the compiler chose",
            ],
            [
              "Memory",
              "Stack offsets, sizes of primitives",
              "Heap allocations, dynamic sizes",
            ],
            [
              "Operating system",
              "Static linking, syscall numbers fixed in libc",
              "Dynamic linking, page faults, scheduling",
            ],
            [
              "Variables",
              '"Is the size known?" If yes: stack',
              '"What\'s the value?" Always runtime',
            ],
          ],
        },
        {
          kind: "prose",
          html: `<p>The whole stack runs on this single distinction. Layer above layer, each one freezes some decision at build time and defers the rest to runtime.</p>`,
        },
        { kind: "heading", text: "Static vs dynamic dispatch" },
        {
          kind: "prose",
          html: `<p>The classic example of a tradeoff that lives exactly on this line: how does the program decide which function to call?</p>
<ul>
  <li><strong>Static dispatch</strong> picks the function at compile time. The call site jumps directly to the right address. Fast, inlinable, but the binary contains a copy of the function for every concrete type that uses it.</li>
  <li><strong>Dynamic dispatch</strong> picks the function at runtime. The call site reads a pointer (a vtable entry, a function pointer) and jumps through it. Slightly slower per call, but the binary stays small and the same code handles any type that follows the contract.</li>
</ul>
<p>Same problem, two timings, different tradeoffs.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustDispatch },
            c: { language: "c", code: cDispatch },
          },
        },
        { kind: "heading", text: "Three families of execution model" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "01 / ahead-of-time",
              value: "C, Rust, Go",
              desc: "All compilation happens before shipping. The binary is final, native, and runs at full hardware speed. Errors caught early; flexibility low.",
            },
            {
              label: "02 / just-in-time",
              value: "Java, JS, .NET",
              desc: "Some compilation happens at startup or while running. Profile-guided optimisations adapt to the real workload. A warm-up cost in exchange for cross-platform binaries and runtime adaptability.",
            },
            {
              label: "03 / interpreted",
              value: "Python, Bash",
              desc: "No precompiled native code at all. The interpreter reads source (or bytecode) and executes line by line. Maximum flexibility (redefine code on the fly), maximum runtime cost.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>Faster languages do more work at compile time, in exchange for less flexibility at runtime. More dynamic languages defer almost everything to runtime, in exchange for the ability to redefine code, change types, or load new modules on the fly. There's no winner; the right answer depends on what you're building.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Rust is ahead-of-time compiled. When you write a Rust Bitcoin node, the entire program is compiled to native machine code before it ships. No JIT warmup. No interpreter overhead. The CPU runs your instructions directly. This is why Rust is replacing C in security-critical infrastructure: AOT compilation means the compiler has already done the safety checks before a single packet arrives. <a href="/blockchain">← see: Blockchain</a> · <a href="/pointers">Pointers</a></p>`,
        },
        { kind: "heading", text: "What pushing decisions earlier actually buys" },
        {
          kind: "callout",
          variant: "info",
          title: "// the four wins of compile-time work",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li><strong>Safety.</strong> Bugs caught at compile time never reach a user. Rust's borrow checker is the extreme version of this idea.</li>
  <li><strong>Speed.</strong> Work done once at build time costs nothing at run time. Constant folding, inlining, generics specialisation.</li>
  <li><strong>Predictability.</strong> Static layouts and static dispatch eliminate whole classes of "it depends on the data" surprises.</li>
  <li><strong>Smaller attack surface.</strong> No <code>eval</code>, no dynamic loading, no surprises means fewer ways for an attacker to inject behaviour the compiler didn't see.</li>
</ol>`,
        },
        { kind: "heading", text: "The whole site, framed by time" },
        {
          kind: "callout",
          variant: "info",
          title: "// from electrons to executable, with the clock running",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li><strong>Build time:</strong> a chip designer writes Verilog. The fab "compiles" it into transistor masks. The masks become silicon.</li>
  <li><strong>Build time:</strong> a compiler reads your source. It decides types, sizes, addresses, instructions, and emits a binary.</li>
  <li><strong>Build time:</strong> a linker stitches your binary together with libc, baking in syscall numbers and resolving symbol addresses.</li>
  <li><strong>Run time:</strong> the OS loads the binary into a fresh virtual address space.</li>
  <li><strong>Run time:</strong> the CPU starts executing instructions. Every fetch-decode-execute cycle is one step in the loop the compiler set up.</li>
  <li><strong>Run time:</strong> page faults map virtual pages to physical RAM. The allocator hands out heap regions on demand.</li>
  <li><strong>Run time:</strong> the program reads input, makes decisions, writes output. The world enters the picture for the first time.</li>
</ol>`,
        },
        { kind: "heading", text: "Bitcoin: compile time meets consensus" },
        {
          kind: "prose",
          html: `<p>Bitcoin has one of the most consequential compile-time / runtime splits in the history of software.</p>`,
        },
        { kind: "heading", text: "The consensus rules are compile time" },
        {
          kind: "prose",
          html: `<p>Bitcoin's consensus rules are hardcoded in every node's binary at compile time. These rules never change at runtime:</p>
<ul>
  <li>Maximum block size: 4 MB (weight)</li>
  <li>Block reward halving schedule</li>
  <li>SHA-256 proof-of-work requirement</li>
  <li>ECDSA signature validation</li>
  <li>Script opcode definitions</li>
  <li>Maximum number of coins: 21 million</li>
</ul>
<p>These are not configuration. They are not parameters. They are constants baked into the binary when Bitcoin Core is compiled.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustConsensus },
            c: { language: "c", code: cConsensus },
          },
        },
        { kind: "heading", text: "Block validation is runtime" },
        {
          kind: "prose",
          html: `<p>Whether a specific block satisfies those compile-time rules is checked at runtime, when the block arrives over the network.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustValidate },
            c: { language: "c", code: cValidate },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the split is clean",
          body: `<strong>What IS a valid Bitcoin block</strong> is compile time: the rules in the binary. <strong>Whether THIS block IS valid</strong> is runtime: this specific block, with these specific transactions, checked against those rules. Change the compile-time rules and you fork Bitcoin. Every node running the old binary rejects your blocks. That is exactly what a hard fork is.`,
        },
        { kind: "heading", text: "Smart contracts: runtime all the way down" },
        {
          kind: "prose",
          html: `<p>Ethereum smart contracts invert this. The EVM (Ethereum Virtual Machine) is an interpreter. Smart contract code is bytecode that executes at runtime, every time a transaction calls a function. This means:</p>
<ul>
  <li>Bugs that Rust would catch at compile time show up only when someone calls the contract, with real money on the line.</li>
  <li>The DAO hack was a runtime reentrancy bug that a compile-time check would have caught. $60 million drained. Irreversible. A hard fork was needed to recover.</li>
</ul>
<p>Compile-time bugs cost ten minutes. Runtime bugs in smart contracts cost everything.</p>
<p>Solidity is adding more compile-time checks. Move (Sui, Aptos) was designed with formal verification and compile-time resource ownership specifically because of the DAO. Rust-based smart contracts (Solana, CosmWasm) bring the borrow checker to on-chain code.</p>
<p>The entire evolution of smart contract language design is the story of moving checks from runtime to compile time. Because at runtime, the money is already moving.</p>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>The compile-time / runtime split shows up under a hundred different names. A few rabbit holes worth following:</p>
<ul>
  <li><strong>Type systems</strong>, especially Hindley-Milner and dependent types, push more invariants into compile time.</li>
  <li><strong>Macros and metaprogramming</strong> let user code run at compile time. Rust macros, C++ templates, Lisp macros are three very different takes.</li>
  <li><strong>JIT compilation</strong>, especially the V8 and HotSpot designs, blends the two phases by recompiling hot code while the program runs.</li>
  <li><strong>Partial evaluation</strong> is the formal study of moving computation between phases. The "Futamura projections" are the classic result.</li>
  <li><strong>Profile-guided optimisation</strong> goes the other direction: feed runtime data back into the compiler for the next build.</li>
</ul>
<p>Every one of those is a different way to shift work along the same line.</p>`,
        },
        { kind: "heading", text: "Where compile vs runtime appears in ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>Once you see the line between the two phases, it is in every layer of the site. Here is where.</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            {
              label: "02 / binary",
              value: "Output, then input",
              desc: "The compiler converts your source to binary machine code at compile time. The CPU decodes and executes those bytes at runtime. Binary is the output of compile time and the input of runtime.",
              href: "/binary",
            },
            {
              label: "01 / number systems",
              value: "Hex disappears",
              desc: "0xCAFEBABE in your source is parsed and converted to bytes at compile time; the hex prefix vanishes. At runtime the CPU loads bytes with no idea they were once hex.",
              href: "/number-systems",
            },
            {
              label: "04 / logic gates",
              value: "Fixed at fabrication",
              desc: "A chip's layout is fixed at fabrication, the chip's compile time. At runtime, current flows through that fixed silicon structure. Like an ahead-of-time compiled program, the hardware cannot change while running.",
              href: "/logic-gates",
            },
            {
              label: "05 / cpu",
              value: "Pick, then run",
              desc: "The ISA defines which bit patterns mean which operations (compile time). Which instruction runs at this moment is always runtime. The compiler picks the instructions; the CPU runs them.",
              href: "/cpu",
            },
            {
              label: "06 / memory",
              value: "Stack vs heap timing",
              desc: "Stack offsets are compile time: the compiler knows where every local lives before the program starts. Heap allocations are runtime: the allocator asks the OS for space only when the code executes.",
              href: "/memory",
            },
            {
              label: "07 / operating system",
              value: "Linking, two phases",
              desc: "Static linking happens at compile time; dynamic linking at runtime startup. Syscall numbers are fixed at compile time, but which argument you pass is determined at runtime.",
              href: "/operating-system",
            },
            {
              label: "08 / variables",
              value: "Shape vs content",
              desc: "Whether a variable is stack or heap is a compile-time decision; what value it holds is runtime. The compiler knows the shape, the program determines the content. The same split, two angles.",
              href: "/variables",
            },
            {
              label: "09 / pointers",
              value: "Verified or trusted",
              desc: "A reference's type is checked at compile time in Rust, and so is its validity. For raw pointers, validity is runtime, and C trusts you on both. Rust verifies one and trusts you on the other.",
              href: "/pointers",
            },
            {
              label: "11 / arrays",
              value: "Sizes and bounds",
              desc: "Fixed array sizes are compile time; Vec sizes are runtime. Bounds checks on literal indices are compile time in Rust; on variable indices they are runtime (C: silent corruption, Rust: panic).",
              href: "/arrays",
            },
            {
              label: "20 / recursion",
              value: "TCO vs overflow",
              desc: "Whether a call is tail-recursive and can become a loop is compile time in languages with TCO. Whether the recursion overflows the stack is always runtime. The base case is a runtime check.",
              href: "/recursion",
            },
            {
              label: "13 / hashing",
              value: "Algorithm vs data",
              desc: "SHA-256's algorithm is fixed at compile time: 64 rounds, specific constants, specific operations. Which block you are hashing is always runtime. The algorithm is known; the data is input.",
              href: "/hashing",
            },
            {
              label: "19 / blockchain",
              value: "Rules vs validation",
              desc: "Bitcoin consensus rules are compile-time constants in every node's binary. Block validation is runtime: this block, with these transactions, meeting those rules. Change the rules and you fork Bitcoin.",
              href: "/blockchain",
            },
            {
              label: "16 / distributed systems",
              value: "Tradeoff vs condition",
              desc: "Whether your system is partitioned right now is only knowable at runtime. But which CAP tradeoff you accept is a compile-time architectural decision made before you shipped.",
              href: "/distributed-systems",
            },
            {
              label: "21 / big o",
              value: "Prediction vs reality",
              desc: "Big O is a compile-time analysis: you reason about the algorithm before running it. Actual performance depends on runtime data shapes, cache state, and branch prediction. Prediction versus reality.",
              href: "/big-o",
            },
            {
              label: "22 / sorting",
              value: "Choice vs comparisons",
              desc: "The sorting algorithm you choose is compile time. How many comparisons it takes on this specific input is runtime. Why nearly-sorted data makes insertion sort win is a runtime property Big O cannot capture.",
              href: "/sorting",
            },
          ],
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "cpu",
        text: `Compile time produces machine instructions; the CPU is runtime, executing them. The boundary on this page is the boundary at the CPU's front door.`,
      },
      {
        slug: "variables",
        text: `A stack variable's offset is fixed at compile time; a heap allocation's address is only known at runtime. The variables page is the cleanest example of this split.`,
      },
      {
        slug: "memory",
        text: `Stack layout is decided by the compiler; heap allocation happens while the program runs. The memory page's two regions map onto this page's two phases.`,
      },
      {
        slug: "pointers",
        text: `Rust moves whole classes of pointer bugs from runtime crashes to compile-time errors. The pointers page is full of mistakes this page decides when to catch.`,
      },
      {
        slug: "operating-system",
        text: `Static linking is compile time; the dynamic linker resolves addresses at startup. The OS page's loader is this page's split running inside the operating system.`,
      },
      {
        slug: "binary",
        text: `A compiler turns source text into a binary of machine code. No compile, no binary, no bits for the CPU to run. The binary page is this page's output.`,
      },
      {
        slug: "big-o",
        text: `Some costs are paid once at compile time, others on every run. Knowing which is a Big O question about where the work lives. The big-o page is the lens.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x0B",
    title: "Houses on a numbered street: arrays from first principles.",
    href: "/arrays",
    label: "arrays",
    variant: "magenta",
  },
};
