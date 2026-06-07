import type { PageContent } from "@/types/content";

const rustBeginner = `// THE WRONG WAY: no base case. This will crash, every time.
// The stack has a limit (usually 8MB on Linux). Each frame is
// maybe 48 bytes: roughly 174,000 calls before death.
fn recurse_wrong(n: u32) {
    println!("{}", n);
    recurse_wrong(n + 1); // calls itself forever
                          // no exit condition
                          // stack grows until the OS kills it
}
// thread 'main' has overflowed its stack
// fatal runtime error: stack overflow

// THE RIGHT WAY: base case first, always.
fn factorial(n: u64) -> u64 {
    match n {
        0 => 1,                    // base case: you know the answer
        n => n * factorial(n - 1), // recursive case: n-1 is smaller
    }
    // match is exhaustive; the compiler verifies every case is
    // handled. You cannot forget the base case and still compile.
}

fn main() {
    println!("{}", factorial(10)); // 3628800
    println!("{}", factorial(0));  // 1, the base case
    println!("{}", factorial(1));  // 1, one step from the base case
}`;

const cBeginner = `#include <stdint.h>
#include <stdio.h>

/* THE WRONG WAY: no base case. This will crash, every time. */
void recurse_wrong(int n) {
    printf("%d\\n", n);
    recurse_wrong(n + 1); /* no base case */
                          /* no exit */
                          /* stack overflow incoming */
}
/* Segmentation fault (core dumped) */

/* THE RIGHT WAY: base case first, always. */
uint64_t factorial(uint64_t n) {
    if (n == 0) return 1;         /* base case */
                                  /* without this line, */
                                  /* nothing ever returns */
    return n * factorial(n - 1);  /* recursive case */
}
/* C trusts you to write the base case. */
/* The compiler will not remind you. The crash will. */

int main(void) {
    printf("%llu\\n", factorial(10)); /* 3628800 */
    printf("%llu\\n", factorial(0));  /* 1 */
    return 0;
}`;

const rustSumList = `// Recursive linked-list traversal. Natural. Clean. Dangerous at scale.
fn sum_list(node: Option<&Node>) -> i64 {
    match node {
        None => 0, // base case: empty list
        Some(n) => n.value + sum_list(n.next.as_deref()),
        // one stack frame per node
        // a list of 100,000 nodes = 100,000 frames = likely overflow
    }
}

// Iterative version: same result, no stack risk.
fn sum_list_iter(mut node: Option<&Node>) -> i64 {
    let mut total = 0;
    while let Some(n) = node {
        total += n.value;       // accumulate in one frame
        node = n.next.as_deref();
    }
    total
    // a list of 100,000,000 nodes = no problem
}`;

const cSumList = `#include <stdint.h>

/* Recursive: natural but dangerous at scale. */
int64_t sum_list(const Node *node) {
    if (node == NULL) return 0;   /* base case */
    return node->value + sum_list(node->next);
    /* one frame per node */
    /* 100,000 nodes = 100,000 frames = probably a crash */
}

/* Iterative: verbose but safe, always. */
int64_t sum_list_iter(const Node *node) {
    int64_t total = 0;
    while (node != NULL) {
        total += node->value;
        node = node->next;
    }
    return total;
    /* one frame, any list length, never crashes */
}`;

const rustFib = `// Naive fibonacci: beautiful, catastrophically slow.
fn fib_naive(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fib_naive(n - 1) + fib_naive(n - 2),
        // two recursive calls per invocation
        // fib(10) makes 177 calls
        // fib(50) makes ~2^50 calls (about a quadrillion)
        // this never finishes for large n
    }
}

// Memoised fibonacci: same concept, now usable.
use std::collections::HashMap;

fn fib_memo(n: u64, memo: &mut HashMap<u64, u64>) -> u64 {
    if let Some(&cached) = memo.get(&n) {
        return cached; // already computed
    }
    let result = match n {
        0 => 0,
        1 => 1,
        n => fib_memo(n - 1, memo) + fib_memo(n - 2, memo),
    };
    memo.insert(n, result); // store for reuse
    result
    // fib(50): 99 calls instead of a quadrillion
}`;

const cFib = `#include <stdint.h>

/* Naive fibonacci: exponential time. */
uint64_t fib_naive(uint64_t n) {
    if (n <= 1) return n;
    return fib_naive(n - 1) + fib_naive(n - 2);
    /* two recursive calls: O(2^n) time */
    /* fib(50) never finishes in practice */
}

/* Memoised fibonacci: linear time. */
static uint64_t cache[100]  = {0};
static int      cached[100] = {0};

uint64_t fib_memo(uint64_t n) {
    if (n <= 1) return n;
    if (cached[n]) return cache[n];
    cache[n]  = fib_memo(n - 1) + fib_memo(n - 2);
    cached[n] = 1;
    return cache[n];
    /* each value computed once: O(n) time */
}`;

const rustTail = `// NOT tail recursive: the stack grows with n.
fn sum_wrong(n: u64) -> u64 {
    if n == 0 { return 0; }
    n + sum_wrong(n - 1)
    // the addition happens AFTER the call returns,
    // so this frame must stay on the stack to finish.
    // n = 100,000 -> 100,000 frames -> overflow
}

// Tail recursive: the stack stays constant.
fn sum_tail(n: u64, acc: u64) -> u64 {
    if n == 0 { return acc; }
    sum_tail(n - 1, acc + n)
    // the addition happens BEFORE the call.
    // nothing is left to do after, so the compiler
    // can reuse the frame: this becomes a loop.
}

fn sum(n: u64) -> u64 {
    sum_tail(n, 0) // public API hides the accumulator
}

// Rust does not guarantee tail-call optimisation, but LLVM
// often applies it in release builds. For a guarantee, use a
// loop or the trampoline pattern below.`;

const cTail = `#include <stdint.h>

/* NOT tail recursive. */
uint64_t sum_wrong(uint64_t n) {
    if (n == 0) return 0;
    return n + sum_wrong(n - 1); /* add after the call returns */
                                 /* so the frame stays alive */
}

/* Tail recursive: GCC and Clang optimise this with -O2. */
uint64_t sum_tail(uint64_t n, uint64_t acc) {
    if (n == 0) return acc;
    return sum_tail(n - 1, acc + n); /* the last operation */
                                     /* becomes a jmp, not a call */
}

uint64_t sum(uint64_t n) {
    return sum_tail(n, 0);
}

/* Verify the tail call was optimised:
 *   gcc -O2 -S recursion.c
 * Look for 'jmp' instead of 'call' in the output. */`;

const rustTrampoline = `// A trampoline turns recursion into iteration, guaranteed,
// regardless of compiler support.
enum Bounce<T> {
    Done(T),
    More(Box<dyn FnOnce() -> Bounce<T>>),
}

fn trampoline<T>(mut bounce: Bounce<T>) -> T {
    loop {
        match bounce {
            Bounce::Done(val) => return val,
            Bounce::More(f) => bounce = f(),
            // each iteration replaces the closure.
            // no stack growth whatsoever.
        }
    }
}

fn fact_bounce(n: u64, acc: u64) -> Bounce<u64> {
    if n == 0 {
        Bounce::Done(acc)
    } else {
        Bounce::More(Box::new(move || fact_bounce(n - 1, acc * n)))
    }
}

fn factorial(n: u64) -> u64 {
    trampoline(fact_bounce(n, 1))
    // runs as a loop internally: zero stack growth, any n.
}`;

const cTrampoline = `#include <stdint.h>

/* A trampoline in C using a small state struct. */
typedef struct Bounce {
    int      done;
    uint64_t value;
    uint64_t next_n;
    uint64_t next_acc;
} Bounce;

Bounce fact_bounce(uint64_t n, uint64_t acc) {
    if (n == 0) {
        return (Bounce){ .done = 1, .value = acc };
    }
    return (Bounce){
        .done     = 0,
        .next_n   = n - 1,
        .next_acc = acc * n,
    };
}

uint64_t factorial(uint64_t n) {
    Bounce b = fact_bounce(n, 1);
    while (!b.done) {                 /* iteration, not recursion */
        b = fact_bounce(b.next_n, b.next_acc);
    }
    return b.value;
    /* one frame, any n, no stack growth */
}`;

const rustMutual = `// Mutual recursion: two functions calling each other.
// Same stack risk as direct recursion.
fn is_even(n: u64) -> bool {
    if n == 0 { return true; }
    is_odd(n - 1) // calls is_odd
}

fn is_odd(n: u64) -> bool {
    if n == 0 { return false; }
    is_even(n - 1) // calls is_even
    // is_even -> is_odd -> is_even -> is_odd ...
    // n = 100,000 -> 100,000 frames -> overflow
}

// Safe version: one function, no mutual calls.
fn is_even_safe(n: u64) -> bool {
    n % 2 == 0 // O(1). No recursion. No stack.
}`;

const cMutual = `#include <stdbool.h>
#include <stdint.h>

/* Mutual recursion: same stack risk as direct recursion. */
bool is_odd(uint64_t n);

bool is_even(uint64_t n) {
    if (n == 0) return true;
    return is_odd(n - 1);   /* calls is_odd */
}

bool is_odd(uint64_t n) {
    if (n == 0) return false;
    return is_even(n - 1);  /* calls is_even */
    /* is_even -> is_odd -> ... -> n frames -> overflow */
}

/* Safe version: no recursion, no stack. */
bool is_even_safe(uint64_t n) {
    return n % 2 == 0; /* O(1) */
}`;

const rustValidateChain = `// The blockchain is conceptually recursive: block N is valid
// only if block N-1 is valid, all the way back to genesis.
// But the chain is 800,000+ blocks deep. Recursion would need
// 800,000 frames and overflow on every machine. So: iterate.
fn validate_chain(tip: &Block) -> bool {
    let mut current = Some(tip);
    while let Some(block) = current {
        if !validate_block(block) {
            return false;
        }
        current = block.prev.as_deref(); // iterate backward
    }
    true
    // the recursive thinking is preserved.
    // the recursive implementation is forbidden.
}`;

const cValidateChain = `/* Bitcoin Core validates the chain iteratively, never
 * recursively. 800,000 blocks at ~200 bytes per frame would be
 * 160MB of stack against an 8MB limit: instant overflow. */
void validate_chain(Block *tip) {
    Block *current = tip;
    while (current != NULL) {
        if (!validate_block(current)) {
            reject_chain();
            return;
        }
        current = current->prev; /* iterate backward */
    }
    /* one stack frame, 800,000 blocks, no overflow, ever */
}`;

export const recursion: PageContent = {
  slug: "recursion",
  hexLabel: "0x14",
  category: "technique",
  hero: {
    eyebrow: "root.system / 0x14 / recursion",
    title: `A function that calls itself.<br><span class="highlight">Until it doesn't.</span>`,
    lede: `Recursion is the most elegant idea in programming. It is also the fastest way to destroy a program. One missing line of code, the stack overflows, the process dies. This page is about that line, and why it is the only thing standing between beautiful code and a crashed server.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What recursion **actually is**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Your program just killed itself. Not slowly. Not with a warning. Not with a chance to recover. Instantly.</p>
<p>One function called itself. That function called itself. That function called itself. Until there was nothing left. This is recursion, and in the wrong hands it is the most elegant way to destroy a program ever invented.</p>
<p>You already know the call stack. You learned it on the memory page. Every function call pushes a frame: local variables, return address, the pointer back to where to go when the function finishes. The stack is fast. The stack is clean. The stack is finite. That last part is the problem.</p>`,
        },
        {
          kind: "prose",
          html: `<p>A recursive function solves a problem by solving a smaller version of the same problem, until the problem is so small it solves itself. That stopping point has a name: the <strong>base case</strong>. Without it, the function never stops, the stack never stops growing, and the OS terminates your process.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "the base case",
              value: "The exit condition",
              desc: "The moment the function stops calling itself: the answer it already knows. Without it: infinite recursion, stack overflow, a dead program. Example: factorial(0) = 1. Zero has no factorial to calculate. It just is 1.",
            },
            {
              label: "the recursive case",
              value: "The step that makes progress",
              desc: "Each call must be smaller than the last, closer to the base case, moving in one direction. Never sideways, never backwards. Example: factorial(n) = n × factorial(n-1). n-1 is smaller, so it eventually reaches 0 and stops.",
            },
          ],
        },
        { kind: "heading", text: "The difference is one line" },
        {
          kind: "raw",
          html: `<p class="formula-block">WITH a base case:<br>factorial(5)<br>&nbsp;&nbsp;factorial(4)<br>&nbsp;&nbsp;&nbsp;&nbsp;factorial(3)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;factorial(2)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;factorial(1)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;factorial(0)&nbsp;&nbsp;<span style="color:var(--neon-emerald)">← BASE CASE: returns 1</span><br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;returns 1<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;returns 2<br>&nbsp;&nbsp;&nbsp;&nbsp;returns 6<br>&nbsp;&nbsp;returns 24<br>returns 120<br><br>WITHOUT a base case:<br>recurse(1)<br>&nbsp;&nbsp;recurse(2)<br>&nbsp;&nbsp;&nbsp;&nbsp;recurse(3)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;recurse(4)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;recurse(<span style="color:var(--neon-crimson)">∞</span>)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:var(--neon-amber)">💥 STACK OVERFLOW</span></p>`,
        },
        { kind: "heading", text: "The wrong way and the right way" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner },
            c: { language: "c", code: cBeginner },
          },
        },
        { kind: "heading", text: "Watch the stack grow and shrink" },
        {
          kind: "prose",
          html: `<p>This is recursion made visible. Pick a function, choose an <code>n</code>, and step through it. Each call pushes a frame; the green base case is where it finally stops; each return pops a frame back off. Then flip <strong>danger mode</strong> to remove the base case and watch the stack climb until it overflows.</p>`,
        },
        { kind: "widget", name: "call-stack-visualiser" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "The stack, the heap, and the **cost**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Every recursive call has a cost: a stack frame holding local variables, the return address, and parameters. On a 64-bit system that is maybe 48 to 200 bytes each. The OS gives your stack roughly 8 megabytes, so that is between 40,000 and 170,000 frames. Deep enough for most problems. Not deep enough for all of them. This is where recursion becomes dangerous.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "recursive · the stack",
              value: "Fast, automatic, finite",
              desc: "Fast to push and pop, automatic cleanup on return, cache-friendly because frames are adjacent. But a hard limit of ~8MB on Linux. n = 100,000 is likely a stack overflow.",
            },
            {
              label: "iterative · the heap",
              value: "Verbose, manual, vast",
              desc: "The heap is gigabytes. No automatic cleanup, slightly more code, an explicit stack or accumulator. But n = 10,000,000 is no problem. Always safer for deep problems.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the critical insight",
          body: `The recursive concept can be beautiful. The recursive implementation can be fatal. Knowing which to use is the scar that separates junior from senior.`,
        },
        { kind: "heading", text: "Recursion on a recursive data structure" },
        {
          kind: "prose",
          html: `<p>A linked list is itself a recursive structure (each node points at the next), so recursive traversal feels natural. It is also a trap: one frame per node means a long list overflows. The iterative version does the same work in a single frame. You learned both structures on the linked-list page; here is the cost of choosing recursion over iteration on them.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustSumList },
            c: { language: "c", code: cSumList },
          },
        },
        { kind: "heading", text: "The Fibonacci trap" },
        {
          kind: "prose",
          html: `<p>The naive recursive Fibonacci is the classic cautionary tale. It is not the stack that kills it but the <em>branching</em>: two calls per invocation means <code>fib(50)</code> spawns roughly a quadrillion calls and never finishes. Memoisation (a hash map, from the hashing page) caches each result so every value is computed once.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustFib },
            c: { language: "c", code: cFib },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// two different failures",
          body: `<code>sum_list</code> fails on <strong>depth</strong>: too many frames. <code>fib_naive</code> fails on <strong>breadth</strong>: too many calls. Recursion can blow up in both directions, and the fixes are different: iteration for depth, memoisation for breadth.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Tail recursion, trampolining, and the **third option**",
      blocks: [
        {
          kind: "prose",
          html: `<p>There is a third choice between beautiful-but-dangerous recursion and safe-but-ugly iteration: <strong>tail recursion</strong>. When the compiler supports it, the stack never grows at all.</p>
<p>A call is tail-recursive when the recursive call is the <em>last</em> operation: nothing happens after it returns, so the current frame has no more work to do, so the compiler can reuse it. Stack depth stays constant. Recursion depth becomes unlimited. At the machine-code level it is identical to a loop.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTail },
            c: { language: "c", code: cTail },
          },
        },
        { kind: "heading", text: "The trampoline pattern" },
        {
          kind: "prose",
          html: `<p>When tail-call optimisation is not guaranteed (Rust does not promise it), a <strong>trampoline</strong> gives you the same constant-stack behaviour by hand: the recursive function returns a description of the next call instead of making it, and a plain loop drives it forward. Recursion in concept, iteration in execution.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTrampoline },
            c: { language: "c", code: cTrampoline },
          },
        },
        { kind: "heading", text: "Mutual recursion: the hidden version" },
        {
          kind: "prose",
          html: `<p>Recursion does not have to be a function calling itself directly. Two functions calling each other create the exact same stack risk, and it is easier to miss in a review because no single function looks recursive.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMutual },
            c: { language: "c", code: cMutual },
          },
        },
        { kind: "heading", text: "Recursion in Bitcoin, and why Bitcoin avoids it" },
        {
          kind: "prose",
          html: `<p>The blockchain is conceptually recursive. Is block N valid? Only if block N-1 is valid. Only if block N-2 is valid. All the way back to block 0, the genesis block. This is recursive validation, and it is beautiful in concept.</p>
<p>But the Bitcoin chain is more than 800,000 blocks deep. A recursive validator would need 800,000 stack frames. At ~200 bytes each that is 160 megabytes of stack against an 8 megabyte limit. Stack overflow, on every machine, every time. So Bitcoin Core uses iteration.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustValidateChain },
            c: { language: "c", code: cValidateChain },
          },
        },
        {
          kind: "prose",
          html: `<p>The Merkle tree is validated iteratively too, even though trees are naturally recursive structures. Cryptographic code avoids recursion for three reasons:</p>
<ul>
  <li><strong>Stack depth is unpredictable.</strong> Inputs from untrusted sources can be crafted to maximise depth. A malicious transaction could push a recursive validator to overflow: a denial-of-service attack.</li>
  <li><strong>Constant stack usage is a security property.</strong> SHA-256 uses exactly the same stack space regardless of input. Attackers cannot influence resource usage through input size.</li>
  <li><strong>The recursive concept survives as documentation.</strong> The reasoning stays recursive; the implementation that ships is iterative.</li>
</ul>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the wisdom recursion teaches",
          body: `The concept can be recursive. The code must be safe. The blockchain page showed the chain as a linked list of hash-linked blocks; this is why that list is always walked with a loop, never a recursive descent. A trustless network cannot let an attacker choose how deep your stack goes.`,
        },
        { kind: "heading", text: "Where recursion touches ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>Recursion is a technique, not a layer, so it reaches into nearly every page below it:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x06 / memory",
              value: "The stack has a limit",
              desc: "Every recursive call pushes a frame onto the stack, a region of memory with a hard ~8MB limit. Recursion without a base case exhausts it and kills the process.",
              href: "/memory",
            },
            {
              label: "0x05 / cpu",
              value: "The stack pointer",
              desc: "The CPU's stack pointer decrements on every call and increments on every return. Cross the stack boundary and the OS sends SIGSEGV. Recursion is the CPU updating one register and writing memory.",
              href: "/cpu",
            },
            {
              label: "0x07 / operating system",
              value: "The OS sets the limit",
              desc: "8MB on Linux and macOS, 1MB on Windows by default. You can raise it with ulimit, but you cannot make it infinite. The OS enforces the physical boundary.",
              href: "/operating-system",
            },
            {
              label: "0x09 / pointers",
              value: "Return addresses",
              desc: "The return address on each frame is a pointer to the instruction to run after the function returns. Deep stacks mean many of them, and buffer-overflow and ROP attacks target exactly these.",
              href: "/pointers",
            },
            {
              label: "0x0B / arrays",
              value: "Divide and conquer",
              desc: "Binary search, merge sort, and quicksort are recursive in concept, each with a careful base case that prevents infinite descent. The foundation of algorithms.",
              href: "/arrays",
            },
            {
              label: "0x0C / linked lists",
              value: "A recursive structure",
              desc: "Each node contains a next pointer, so traversal is naturally recursive and dangerously so: ten million nodes need ten million frames recursively, one frame iteratively.",
              href: "/linked-list",
            },
            {
              label: "0x0D / hashing",
              value: "Constant depth on purpose",
              desc: "SHA-256 uses the same stack depth regardless of input. Cryptographic functions avoid recursion because variable, attacker-influenced depth is a vulnerability.",
              href: "/hashing",
            },
            {
              label: "0x0A / compile vs runtime",
              value: "A runtime failure",
              desc: "Rust warns about infinite recursion at compile time when it can detect it, but most recursive bugs surface at runtime: the overflow happens when the program runs, not when it compiles.",
              href: "/compile-vs-runtime",
            },
            {
              label: "0x13 / blockchain",
              value: "Validated with a loop",
              desc: "Bitcoin validates 800,000+ blocks iteratively. The chain is conceptually recursive (this block is valid because the previous is) but the implementation is a while loop, because recursion at that depth would overflow every node.",
              href: "/blockchain",
            },
            {
              label: "0x10 / distributed systems",
              value: "A DoS surface",
              desc: "Recursive algorithms on data from untrusted peers are dangerous: a malicious peer can craft a structure that maximises recursive depth and triggers a stack overflow. Iterative validation defends against it.",
              href: "/distributed-systems",
            },
          ],
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "linked-list",
        text: `A linked list is recursive by nature: a node followed by a smaller list. Walking it is the textbook recursive function. The linked-list page is recursion's simplest data structure.`,
      },
      {
        slug: "sorting",
        text: `Merge sort and quicksort are recursion in action: split the array, sort the halves, combine. The sorting page is where recursion earns its keep.`,
      },
      {
        slug: "memory",
        text: `Each recursive call pushes a stack frame, and too many overflow the stack. The memory page is where the call stack lives and where recursion can crash.`,
      },
      {
        slug: "hashing",
        text: `A Merkle tree is hashing applied recursively: hash the leaves, hash pairs of hashes, repeat to the root. The hashing page is recursion with a cryptographic payload.`,
      },
      {
        slug: "nodes",
        text: `Trees are nodes pointing at child nodes, and trees are walked recursively. The nodes page is the structure; recursion is the way through it.`,
      },
      {
        slug: "big-o",
        text: `Recursion's cost is a recurrence, and solving it gives the Big O. Merge sort's T(n) = 2T(n/2) + n becomes O(n log n). The big-o page does that math.`,
      },
      {
        slug: "cpu",
        text: `Every call is the CPU pushing a frame, jumping, and later returning. The CPU page is the fetch-decode-execute loop that recursion folds back on itself.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x15",
    title: "Same answer, 317 years apart. How to measure the shape of an algorithm.",
    href: "/big-o",
    label: "big o notation",
    variant: "magenta",
  },
};
