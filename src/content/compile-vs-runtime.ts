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

export const compileVsRuntime: PageContent = {
  slug: "compile-vs-runtime",
  hexLabel: "0x0A",
  category: "time",
  hero: {
    eyebrow: "root.system / 0x0A / time",
    title: `Two phases.<br><span class="highlight">One program.</span>`,
    lede: `Every line you write happens twice. Once when the compiler reads it and turns it into a binary, and again, in a different shape, when the CPU actually runs it. The first phase is <strong>compile time</strong>. The second is <strong>runtime</strong>. Almost every tradeoff in programming, from type systems to performance to safety, comes down to where the work happens.`,
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
        { kind: "heading", text: "What about an interpreter?" },
        {
          kind: "prose",
          html: `<p>A pure interpreter (Python, Ruby, Bash) skips the up-front compile step. It reads source code and executes it directly. There's still a parse phase that runs before execution, but it happens on the user's machine, every time the program runs. So a typo that a Rust or C compiler catches before shipping shows up in Python only when the line is actually reached at runtime.</p>
<p>This is the same compile/runtime split, drawn at a different point. Less compile-time work means more runtime risk.</p>`,
        },
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
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x0B",
    title: "Houses on a numbered street: arrays from first principles.",
    href: "/arrays",
    label: "arrays",
    variant: "magenta",
  },
};
