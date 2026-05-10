import type { PageContent } from "@/types/content";

const rustWhereLives = `// Where does each piece of data live in memory?
// Print the address of one example from every storage class.

const C_CONST: i32 = 999;            // baked into the binary, read-only
static G_INIT: i32 = 100;            // initialised global → DATA
static mut G_BSS: i32 = 0;           // zero-init global  → BSS
static G_LIT: &str = "hello world";  // bytes in RODATA, slice on stack

fn main() {
    let x: i32 = 42;                 // local primitive → STACK
    let v: Vec<i32> = vec![1, 2, 3]; // header on STACK, buffer on HEAP
    let b: Box<i32> = Box::new(7);   // pointer on STACK, value on HEAP

    println!("CONST  @ {:p}", &C_CONST);
    println!("DATA   @ {:p}", &G_INIT);
    println!("BSS    @ {:p}", unsafe { &raw const G_BSS });
    println!("RODATA @ {:p}  (the bytes \\"{}\\" live here)", G_LIT.as_ptr(), G_LIT);
    println!("STACK  @ {:p}  (x = {})", &x, x);
    println!("HEAP   @ {:p}  (Vec buffer; header @ {:p})", v.as_ptr(), &v);
    println!("HEAP   @ {:p}  (Box payload; pointer @ {:p})", &*b, &b);
}

// Typical output (addresses vary every run on Linux/macOS due to ASLR):
// CONST  @ 0x55b6e9c1d000   ← low addresses, the binary
// DATA   @ 0x55b6e9c1d100   ← right next to CONST
// BSS    @ 0x55b6e9c1d200
// RODATA @ 0x55b6e9c1d420
// STACK  @ 0x7ffe23a4f8d4   ← high addresses
// HEAP   @ 0x55b6ea102b30   ← middle, allocator-managed`;

const cWhereLives = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

const int C_CONST = 999;        // RODATA: read-only, baked into binary
int       g_init  = 100;        // DATA  : initialised global
int       g_bss;                // BSS   : zero-initialised global

int main(void) {
    int   x   = 42;             // STACK : local primitive
    char  arr[5] = "hi!";       // STACK : the string is *copied* here
    char *lit = "hello world";  // pointer on STACK, bytes in RODATA
    int  *p   = malloc(sizeof *p);
    *p = 7;                     // HEAP  : malloc'd value

    printf("RODATA @ %p   (constant)\\n", (void*)&C_CONST);
    printf("DATA   @ %p   (g_init=%d)\\n", (void*)&g_init, g_init);
    printf("BSS    @ %p   (g_bss=%d, zero by default)\\n",
           (void*)&g_bss, g_bss);
    printf("STACK  @ %p   (x=%d)\\n",  (void*)&x, x);
    printf("STACK  @ %p   (local arr=\\"%s\\")\\n", (void*)arr, arr);
    printf("RODATA @ %p   (string literal \\"%s\\")\\n", (void*)lit, lit);
    printf("HEAP   @ %p   (*p=%d)\\n", (void*)p, *p);

    free(p);
    return 0;
}`;

const rustPrimVsDyn = `// Two structs storing the same logical data, laid out
// completely differently in memory.

#[repr(C)]
struct Point {       // primitive: fixed size known at compile time
    x: f64,
    y: f64,
}                    // sizeof(Point) = 16 bytes; one contiguous block.

fn main() {
    let p = Point { x: 3.14, y: 2.71 };
    let s: String = String::from("hello, world");

    println!("--- primitive ---");
    println!("sizeof Point         = {} bytes",
             std::mem::size_of::<Point>());      // 16
    println!("p lives @            {:p}", &p);   // STACK
    println!("p.x & p.y are right next to each other:");
    println!("  &p.x = {:p}", &p.x);
    println!("  &p.y = {:p}  (16 bytes after p, technically 8)", &p.y);

    println!("--- dynamic ---");
    println!("sizeof String header = {} bytes",
             std::mem::size_of::<String>());     // 24: (ptr, len, cap)
    println!("s header lives @     {:p}  (STACK)", &s);
    println!("s.as_ptr()       =   {:p}  (HEAP, the actual bytes)",
             s.as_ptr());
    println!("len/capacity     =   {}/{}", s.len(), s.capacity());
}`;

const cPrimVsDyn = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    double x;
    double y;
} Point;

// "Dynamic string": a (ptr, len, cap) header, just like Rust's String.
typedef struct {
    char   *data;
    size_t  len;
    size_t  cap;
} String;

String string_from(const char *s) {
    size_t n = strlen(s);
    String out = { malloc(n + 1), n, n + 1 };
    memcpy(out.data, s, n + 1);
    return out;
}

int main(void) {
    Point  p = {3.14, 2.71};
    String s = string_from("hello, world");

    puts("--- primitive ---");
    printf("sizeof(Point)        = %zu bytes\\n", sizeof p);     // 16
    printf("p lives @            %p   (STACK)\\n", (void*)&p);
    printf("  &p.x = %p\\n", (void*)&p.x);
    printf("  &p.y = %p   (8 bytes later, contiguous)\\n", (void*)&p.y);

    puts("--- dynamic ---");
    printf("sizeof(String)       = %zu bytes\\n", sizeof s);     // 24
    printf("s header lives @     %p   (STACK)\\n", (void*)&s);
    printf("s.data           =   %p   (HEAP, the bytes)\\n", (void*)s.data);
    printf("len/cap          =   %zu/%zu\\n", s.len, s.cap);

    free(s.data);
    return 0;
}`;

const rustOwnership2 = `// Lifetime in code: where each piece of data is born and dies.
fn make_string() -> String {
    let s = String::from("created here");
    s   // ← OWNERSHIP transferred to the caller. The HEAP buffer
        //   survives; the local stack frame's String header is moved.
}       //   No copy; just three pointer-sized fields handed off.

fn main() {
    let outer = make_string();
    println!("{outer}");
}   // ← outer goes out of scope here. Its Drop impl runs:
    //   1) free the HEAP buffer (calls into the allocator)
    //   2) the stack header is dropped automatically.
    //
    // No GC, no manual free. The compiler inserted both steps
    // by reading the lifetime. That's what "ownership" buys you.`;

const cOwnership2 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Same shape, but C makes you remember to free.
char *make_string(void) {
    char *s = malloc(13);
    memcpy(s, "created here", 13);
    return s;          // pointer is returned; HEAP buffer lives on.
}

int main(void) {
    char *outer = make_string();
    printf("%s\\n", outer);
    free(outer);       // ← forget this and you have a leak.
                       //   call it twice and you have a double-free.
                       //   the C compiler will say nothing either way.
    return 0;
}`;

export const variables: PageContent = {
  slug: "variables",
  hexLabel: "0x08",
  category: "data",
  hero: {
    eyebrow: "root.system / 0x08 / data",
    title: `let x = 42.<br><span class="highlight">Where does it go?</span>`,
    lede: `You write a single line, <code>let x = 42</code> in Rust or <code>int x = 42;</code> in C, and somewhere in your machine four bytes get the pattern <code>00101010</code> stamped into them. <em>Where</em> exactly? Why does <code>String</code> behave differently from <code>i32</code>? This page traces a variable from your source line to its actual bytes in RAM.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "A **variable** is a name for an address",
      blocks: [
        {
          kind: "prose",
          html: `<p>When the compiler sees <code>let x = 42</code>, three things happen:</p>
<ol>
  <li>The compiler picks <strong>where</strong> the variable will live, usually a fixed offset on the function's stack frame. The name <code>x</code> never reaches the binary; it just becomes "the 4 bytes at SP − 12" or whatever offset it chose.</li>
  <li>The compiler emits a <strong>store</strong> instruction that writes the bits of <code>42</code> (<code>00101010</code>) into those 4 bytes.</li>
  <li>Anywhere your code uses <code>x</code>, the compiler emits a <strong>load</strong> from the same address.</li>
</ol>
<p>So a "variable" is just a label the compiler uses to keep track of an address. The CPU doesn't know about variables; it only knows loads and stores.</p>`,
        },
        { kind: "heading", text: "The OS gave the process the room first" },
        {
          kind: "prose",
          html: `<p>None of this works without the OS. When your program launched, the kernel:</p>
<ul>
  <li>Created a virtual address space for the process (one private universe; see the operating system page).</li>
  <li>Loaded the binary's read-only sections (<code>text</code>, <code>rodata</code>) into low addresses.</li>
  <li>Loaded the writable globals (<code>data</code>, <code>bss</code>) right after.</li>
  <li>Reserved a stack region near the top of the address space and pointed the stack-pointer register at it.</li>
  <li>Left a giant gap in the middle for the heap to grow into on demand.</li>
</ul>
<p>From there, your variables can land in <em>any</em> of those regions, depending on how they're declared. The compiler picks; the OS just made the regions exist.</p>`,
        },
        { kind: "heading", text: "Five places a value can live" },
        {
          kind: "table",
          headers: ["region", "what's there", "set up by", "lifetime"],
          rows: [
            [
              "<code>text</code>",
              "Compiled instructions of your program",
              "Compiler &amp; OS at exec",
              "Process lifetime (read-only)",
            ],
            [
              "<code>rodata</code>",
              "<code>const</code>s, string literals, lookup tables",
              "Compiler &amp; OS at exec",
              "Process lifetime (read-only)",
            ],
            [
              "<code>data</code> + <code>bss</code>",
              "Mutable globals / <code>static</code>s",
              "Compiler &amp; OS at exec",
              "Process lifetime",
            ],
            [
              "Stack",
              "Function locals, parameters, return addresses",
              "Compiler emits SP-bumps; OS reserved the region",
              "From function entry to return",
            ],
            [
              "Heap",
              "<code>malloc</code> / <code>Box</code> / <code>Vec</code> / <code>String</code> bodies",
              "Allocator (libc, jemalloc, …) on demand",
              "Until <code>free</code>'d (C) or dropped (Rust)",
            ],
          ],
        },
        { kind: "heading", text: "See it: print where each lives" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustWhereLives },
            c: { language: "c", code: cWhereLives },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the address is the variable",
          body: `<code>&amp;x</code> in either language is just a number: the address the compiler picked for <code>x</code>. Print it (<code>{:p}</code> in Rust, <code>%p</code> in C) and you're literally seeing the chosen storage location. Stack addresses are huge (near the top of the address space); heap is in the middle; binary regions sit at the bottom.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "**Primitive** vs dynamic data",
      blocks: [
        {
          kind: "prose",
          html: `<p>The split that drives almost every memory-layout decision:</p>
<ul>
  <li>A type whose <strong>size is known at compile time</strong>: every <code>i32</code> is 4 bytes, every <code>f64</code> is 8, every <code>Point { x: f64, y: f64 }</code> is 16. The compiler can reserve exactly the right space on the stack.</li>
  <li>A type whose <strong>size is decided at runtime</strong>: a string the user types, a vector that grows. The compiler doesn't know how many bytes you'll need, so the bytes <em>can't</em> live on the stack.</li>
</ul>
<p>The fix is universal: split the type into a small, fixed-size <strong>header</strong> (which lives on the stack) and a variable-size <strong>buffer</strong> (which lives on the heap, addressed by a pointer in the header).</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">PRIMITIVE: Point { x: f64, y: f64 }<br>┌──────────────────────┐<br>│ x = 3.14   y = 2.71  │  ← all 16 bytes on the stack<br>└──────────────────────┘<br><br>DYNAMIC: String "hello, world"<br>STACK                       HEAP<br>┌─────────────────────┐    ┌──────────────────────────────┐<br>│ ptr ──────────────────→  │ h e l l o ,   w o r l d \\0   │<br>│ len = 12            │    └──────────────────────────────┘<br>│ cap = 16            │<br>└─────────────────────┘<br>      24 bytes total<br>      (header only; buffer lives elsewhere)</p>`,
        },
        {
          kind: "prose",
          html: `<p>This is the same pattern in every language. <strong>Rust</strong> calls them <code>Vec</code>, <code>String</code>, <code>Box</code>. <strong>C</strong> doesn't bake them in; you build the same shape with a struct and <code>malloc</code>. <strong>Java</strong> hides it behind a reference; <strong>Python</strong> hides it behind <em>everything</em>. But the layout is identical underneath: a fixed-size header that points at a heap-allocated body.</p>`,
        },
        { kind: "heading", text: "Same data, two layouts" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustPrimVsDyn },
            c: { language: "c", code: cPrimVsDyn },
          },
        },
        { kind: "heading", text: "Why this is a tradeoff, not a problem" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "stack-only (primitive)",
              value: "Fast, fixed",
              desc: "One register move to allocate, automatic to free. Cache-friendly. But the size is locked in at compile time, with no growing and no user-determined dimensions.",
            },
            {
              label: "heap-backed (dynamic)",
              value: "Flexible, slower",
              desc: "Allocator call to create, allocator call to free. Pointer chases on every read. But the size is whatever you need at runtime, and the data outlives the function that made it.",
            },
          ],
        },
        { kind: "heading", text: "Pointers, references, smart pointers" },
        {
          kind: "prose",
          html: `<p>Whenever a variable's data lives somewhere else, what's stored locally is a <strong>pointer</strong>: an address. Different languages dress this idea differently:</p>
<ul>
  <li><strong>C raw pointer</strong>: <code>int *p</code>. A bare address. You manage everything.</li>
  <li><strong>Rust reference</strong>: <code>&amp;T</code>. A pointer the compiler statically guarantees is valid for some scope.</li>
  <li><strong>Rust <code>Box&lt;T&gt;</code></strong>: owned heap pointer. Frees on drop.</li>
  <li><strong>Rust <code>Rc&lt;T&gt;</code> / <code>Arc&lt;T&gt;</code></strong>: reference-counted heap pointer. Frees when count hits zero.</li>
</ul>
<p>All of them are, in memory, the same 8 bytes (on a 64-bit system) holding an address. The differences are entirely about <em>what guarantees the type system makes</em> about that address.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the rule",
          body: `<strong>Fixed size known to the compiler →</strong> stack (or DATA, if it's <code>static</code>). <strong>Size only known at runtime, or needs to outlive its creating function →</strong> heap. The pointer to the heap thing is itself a fixed-size primitive that goes on the stack.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "**Alignment**, lifetime &amp; ownership",
      blocks: [
        { kind: "heading", text: "Alignment and padding" },
        {
          kind: "prose",
          html: `<p>The compiler doesn't pack fields as tightly as it might. CPUs prefer multi-byte values to start at addresses that are multiples of their size: a 4-byte <code>i32</code> at an address divisible by 4, an 8-byte <code>f64</code> at one divisible by 8. This is <strong>alignment</strong>, and the compiler enforces it by inserting invisible <strong>padding</strong> bytes between fields. Sometimes a struct is bigger than the sum of its parts, and the order you write the fields in matters.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">struct Bad  { u8 a; u32 b; u8 c; }   →  12 bytes (padded)<br>  offset  0  1  2  3   4  5  6  7   8  9 10 11<br>  bytes   a  -  -  -   b  b  b  b   c  -  -  -<br>          (1)(3 pad)  (4-byte b )   (1)(3 pad, round to 4)<br><br>struct Good { u32 b; u8 a; u8 c; }   →  8 bytes<br>  offset  0  1  2  3   4  5  6  7<br>  bytes   b  b  b  b   a  c  -  -<br>          (4-byte b ) (1)(1)(2 pad)</p>`,
        },
        {
          kind: "prose",
          html: `<p>Same fields, two byte-counts. In hot loops on millions of objects, this matters. Rust's <code>#[repr(C)]</code> turns off field reordering for FFI compatibility; default Rust is free to reorder for size.</p>`,
        },
        { kind: "heading", text: "Lifetime: when does the memory stop being valid?" },
        {
          kind: "prose",
          html: `<p>Stack memory has a hard rule: <strong>the moment its function returns, those bytes are reclaimed</strong>. Anything on the stack (local variables, function parameters, the function's view of the world) is <em>gone</em>. Any pointer to that memory becomes a <em>dangling pointer</em> the instant the function exits.</p>
<p>Heap memory is the opposite: it stays valid until something explicitly releases it. The question is <em>who</em> that something is, and that's the entire memory-safety question.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustOwnership2 },
            c: { language: "c", code: cOwnership2 },
          },
        },
        { kind: "heading", text: "Three philosophies for variable lifetime" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "01 / manual",
              value: "C, C++",
              desc: "You wrote the malloc, you write the free. Forget it: leak. Free it twice: corruption. Free it then read: undefined behaviour. Maximum control, zero safety net.",
            },
            {
              label: "02 / runtime",
              value: "Java, Go, Python",
              desc: "A garbage collector traces what's still reachable from live references and frees the rest. You never call free. Safe and ergonomic, but you pay in pause times and lose precise control over layout.",
            },
            {
              label: "03 / compile-time",
              value: "Rust",
              desc: "The compiler reads ownership and lifetime annotations, refuses programs that could free memory while a reference is still alive. No GC. No manual free. The check is in the type system.",
            },
          ],
        },
        { kind: "heading", text: "Globals, statics, constants: what are they really?" },
        {
          kind: "table",
          headers: ["declaration", "where it lives", "writable?", "lifetime"],
          rows: [
            [
              "Rust <code>const X: i32 = …</code>",
              "<code>rodata</code> (or inlined into instructions)",
              "no",
              "process",
            ],
            [
              "Rust <code>static X: i32 = …</code>",
              "<code>data</code> (initialised) / <code>bss</code> (zero)",
              "only via <code>static mut</code> + <code>unsafe</code>",
              "process",
            ],
            [
              "Rust <code>&amp;'static str</code> literal",
              "bytes in <code>rodata</code>; the slice header is anywhere",
              "no",
              "process (the bytes); local (the slice)",
            ],
            [
              "C <code>const int X = …</code>",
              "<code>rodata</code>",
              "no",
              "process",
            ],
            [
              "C <code>int g = 5;</code> at file scope",
              "<code>data</code>",
              "yes",
              "process",
            ],
            [
              "C <code>int g;</code> at file scope",
              "<code>bss</code> (auto-zeroed at exec)",
              "yes",
              "process",
            ],
            [
              "C <code>static int x</code> inside fn",
              "<code>data</code> / <code>bss</code> (visibility-scoped, lifetime is process-wide)",
              "yes",
              "process",
            ],
          ],
        },
        { kind: "heading", text: "What the OS sees, end to end" },
        {
          kind: "callout",
          variant: "info",
          title: "// from let x = 42 to bits in RAM",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li>You write <code>let x = 42</code> in source.</li>
  <li>The compiler picks an address for <code>x</code>: a stack offset for a local, or a fixed RODATA/DATA/BSS address for a const or static.</li>
  <li>The compiler emits machine code that executes a store of the bits of 42 into that address.</li>
  <li>At program launch, the OS creates the process's virtual address space and lays out the binary's regions.</li>
  <li>When your function runs, the CPU executes the store. The MMU translates the virtual address to physical RAM (with help from the kernel's page tables).</li>
  <li>The bits land in actual transistor-level state on a DRAM chip somewhere on your motherboard.</li>
  <li>And on the read, the whole chain reverses, in a few nanoseconds.</li>
</ol>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>You now have the through-line: source → compiler → binary regions → OS-managed virtual memory → MMU → DRAM. A few good directions:</p>
<ul>
  <li><strong>Compiler Explorer (godbolt.org)</strong>: paste your code, see exactly which addresses the compiler picks and which load/store instructions it emits.</li>
  <li><strong>Reading <code>readelf -S binary</code></strong> on Linux: list every region of an executable (TEXT, DATA, BSS, RODATA) and where each one will be loaded.</li>
  <li><strong>The Rustonomicon</strong>, chapter on data representation: exhaustive on layout, repr, niches, and how Rust packs enums.</li>
  <li><strong>Hennessy &amp; Patterson, <em>Computer Architecture</em></strong>, for the hardware end of the chain (caches, prefetchers, write buffers).</li>
</ul>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x09",
    title: "When does each piece happen? Compile time vs runtime.",
    href: "/compile-vs-runtime",
    label: "compile vs runtime",
    variant: "magenta",
  },
};
