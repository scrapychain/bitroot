import type { PageContent } from "@/types/content";

const rustBasic = `fn main() {
    let x: i32 = 42;

    // RAW pointer: a number that happens to be an address.
    // \`*const i32\` reads "pointer to a constant i32".
    let p: *const i32 = &x;

    println!("x lives at  : {:p}", &x);
    println!("p stores    : {:p}", p);

    // Dereferencing a raw pointer is \`unsafe\` because Rust can't
    // prove the address is still valid. With a known-good pointer
    // like this one, it's fine; in general, all the C bugs apply.
    let value = unsafe { *p };
    println!("*p          : {}", value);

    // The idiomatic Rust pointer is a *reference*, written \`&T\`.
    // The compiler tracks how long it's valid (its lifetime) and
    // refuses to compile code that could dereference a dead one.
    let r: &i32 = &x;
    println!("*r          : {}", *r);
}`;

const cBasic = `#include <stdio.h>

int main(void) {
    int x = 42;

    // A pointer is a variable whose value is an address.
    // \`int *\` reads "pointer to an int".
    int *p = &x;

    printf("x lives at  : %p\\n", (void*)&x);
    printf("p stores    : %p\\n", (void*)p);

    // Dereference. The compiler doesn't check that p is valid.
    printf("*p          : %d\\n", *p);

    // Write through the pointer.
    *p = 100;
    printf("x is now    : %d\\n", x);
    return 0;
}`;

const cLinkedList = `#include <stdio.h>
#include <stdlib.h>

// A self-referential struct: each node holds a pointer to the next
// node, or NULL at the end. This is impossible without pointers.
typedef struct Node {
    int value;
    struct Node *next;
} Node;

Node *cons(int v, Node *next) {
    Node *n = malloc(sizeof *n);
    n->value = v;
    n->next  = next;
    return n;
}

int main(void) {
    // Build the list  1 -> 2 -> 3 -> NULL.
    Node *head = cons(1, cons(2, cons(3, NULL)));

    // Walk it.
    for (Node *cur = head; cur; cur = cur->next)
        printf("%d ", cur->value);
    putchar('\\n');

    // Free it. Forget this step and the memory leaks.
    while (head) {
        Node *next = head->next;
        free(head);
        head = next;
    }
    return 0;
}`;

const rustLinkedList = `// Same shape in Rust: each node *owns* the next node, expressed
// as \`Option<Box<Node>>\`. None marks the end of the list.
struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

fn cons(value: i32, next: Option<Box<Node>>) -> Box<Node> {
    Box::new(Node { value, next })
}

fn main() {
    let head = cons(1, Some(cons(2, Some(cons(3, None)))));

    let mut cur = Some(&*head);
    while let Some(node) = cur {
        print!("{} ", node.value);
        cur = node.next.as_deref();
    }
    println!();

    // No free() needed. \`head\` goes out of scope here; Drop
    // walks the chain and releases every allocation in order.
}`;

const cUaf = `#include <stdio.h>
#include <stdlib.h>

int *make(int v) {
    int *p = malloc(sizeof *p);
    *p = v;
    return p;
}

int main(void) {
    int *a = make(42);
    int *b = a;          // both pointers alias the SAME allocation.

    printf("%d\\n", *a);  // 42, fine.
    free(a);             // the allocator reclaims those 4 bytes.

    // b is now a *dangling pointer*. The compiler said nothing.
    // What this prints depends on what the allocator wrote there
    // next: maybe 42, maybe garbage, maybe a segfault, maybe an
    // attacker-controlled value. All four are valid outcomes of
    // undefined behaviour.
    printf("%d\\n", *b);
    return 0;
}`;

const rustUaf = `// The same logical mistake. Rust refuses to compile it.
fn main() {
    let a = Box::new(42);
    let b = &a;            // borrow: b lives only as long as a does.

    println!("{}", *a);

    drop(a);               // explicitly release.

    // println!("{}", **b);
    //                 ^^ error[E0382]: borrow of moved value: \`a\`
    //
    // The borrow checker tracked the lifetime of \`b\` and saw it
    // outlived \`a\`. Compilation stops; no binary is produced.
    //
    // The entire class of "use after free" is eliminated, not by a
    // runtime check, but by refusing to build programs that could
    // express it.
}`;

export const pointers: PageContent = {
  slug: "pointers",
  hexLabel: "0x09",
  category: "indirection",
  hero: {
    eyebrow: "root.system / 0x09 / indirection",
    title: `A number<br><span class="highlight">that means somewhere.</span>`,
    lede: `A <strong>pointer</strong> is just an integer, the same kind covered on the binary page. What makes it different is the meaning we give it: this number is the <em>address</em> of something else in memory. Every dynamic data structure, every reference, every callback, every syscall buffer in your program is built from this single idea. So are most of the famous bugs in the history of software.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What's a **pointer**?",
      blocks: [
        {
          kind: "prose",
          html: `<p>You already saw, on the memory page, that every byte in your program's address space has a number stamped on it. A <strong>pointer</strong> is a variable whose <em>value</em> is one of those numbers. Read through the pointer (<em>dereference</em> it) and you read the byte at that address. Write through the pointer and you write the byte at that address.</p>
<p>That's the whole mechanism. Every "reference", "handle", "object", and "ID" in every language is, somewhere underneath, this idea.</p>`,
        },
        {
          kind: "diagram",
          name: "pointer-to-value",
        },
        {
          kind: "prose",
          html: `<p>On a 64-bit system, a pointer is always 8 bytes wide, no matter what it points at. A pointer to an <code>i32</code> is 8 bytes. A pointer to a 1 GB array is 8 bytes. A pointer to another pointer is 8 bytes. The <em>type</em> attached to a pointer is the compiler's way of remembering how to interpret the bytes at the destination; the pointer itself is always just one address.</p>`,
        },
        { kind: "heading", text: "Declare, take an address, dereference" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBasic },
            c: { language: "c", code: cBasic },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the three operators",
          body: `<code>&amp;x</code> says "the address of <code>x</code>." <code>*p</code> says "the thing at the address stored in <code>p</code>." <code>p->field</code> (C) and <code>p.field</code> (Rust) are shortcuts for "follow the pointer, then read the field." Once you internalise these three, every pointer-using language reads the same.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Why pointers **exist**",
      blocks: [
        {
          kind: "prose",
          html: `<p>If pointers are just numbers that happen to be addresses, why do we go to so much trouble over them? Because they enable five things that nothing else can.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "reason 01",
              value: "Sharing without copying",
              desc: "Pass a 1 GB image to a function by handing it the 8-byte address instead of copying the bytes. Every fast language uses pointers (or references, which are pointers in disguise) for this.",
            },
            {
              label: "reason 02",
              value: "Dynamic allocation",
              desc: "When the size of a thing is only known at runtime, the bytes live on the heap (see /variables) and a pointer on the stack tells you where to find them. Vec, String, malloc: all the same shape.",
            },
            {
              label: "reason 03",
              value: "Recursive structures",
              desc: "Linked lists, trees, and graphs cannot exist without pointers. A node embedding its successor is impossible; a node pointing at its successor is trivial.",
            },
            {
              label: "reason 04",
              value: "Polymorphism",
              desc: "Function pointers and vtables let one call site dispatch to many implementations. Every plug-in system, every virtual method, every callback is a pointer-to-code.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>And the fifth reason is the one closest to the hardware: <strong>talking to the world</strong>. Memory-mapped device registers, DMA buffers, syscall arguments, file mappings (the <code>mmap</code> trick from the OS page), shared memory between processes. Every one of those is a pointer that means something to the kernel, the device, or another process. Pointers are the universal handle.</p>`,
        },
        { kind: "heading", text: "A linked list, in two languages" },
        {
          kind: "prose",
          html: `<p>Linked lists are the canonical pointer example. Each node owns a value and a pointer to the next node. In C, that pointer is a raw <code>struct Node *</code>; in Rust, it's an <code>Option&lt;Box&lt;Node&gt;&gt;</code>, which is just a nullable owned pointer. The shape is identical. The guarantees are not.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustLinkedList },
            c: { language: "c", code: cLinkedList },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// pointer-chasing has a price",
          body: `Every dereference is a load instruction. The CPU page covered why this matters: if the next node lives in a different cache line, the load stalls for tens to hundreds of cycles. A <code>Vec&lt;T&gt;</code> beats a linked list on almost every modern workload, because contiguous memory is what caches were built for.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Why pointers are **dangerous** (and how Rust changes the game)",
      blocks: [
        {
          kind: "prose",
          html: `<p>A pointer is an unchecked promise. The compiler trusts that the address it stores is valid; the type system trusts that the bytes there match the declared type; the programmer trusts the address won't be reused or released while still in use. Each of those trusts is a bug waiting to happen.</p>`,
        },
        { kind: "heading", text: "The five classic pointer bugs" },
        {
          kind: "table",
          headers: ["bug", "what happens", "trigger"],
          rows: [
            [
              "<strong>Null dereference</strong>",
              "Read through a pointer that's <code>NULL</code> or <code>nullptr</code>. Usually a segfault.",
              "Forgetting to check <code>malloc</code>'s return, or following a missing parent in a tree.",
            ],
            [
              "<strong>Use-after-free</strong>",
              "Read or write through a pointer to memory that's already been released.",
              "Freeing one alias while another still points at the same allocation.",
            ],
            [
              "<strong>Double free</strong>",
              "Calling <code>free</code> twice on the same address. Corrupts the allocator's bookkeeping; later allocations alias or crash.",
              "Two pointers to the same block, both calling <code>free</code>.",
            ],
            [
              "<strong>Wild pointer</strong>",
              "Dereferencing an uninitialised pointer. Reads from a random address.",
              "Declaring <code>int *p;</code> in C and using it without first assigning a real address.",
            ],
            [
              "<strong>Out-of-bounds</strong>",
              "Pointer arithmetic that walks past the end of an allocation.",
              "<code>p + n</code> where <code>n</code> exceeds the buffer length. The basis of most buffer-overflow exploits.",
            ],
          ],
        },
        {
          kind: "prose",
          html: `<p>Every one of those is <strong>undefined behaviour</strong> in C. The compiler is allowed to assume they never happen, so the resulting program can do <em>anything</em> when they do. Decades of CVEs are precisely these five bugs.</p>`,
        },
        { kind: "heading", text: "The same mistake, two languages" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustUaf },
            c: { language: "c", code: cUaf },
          },
        },
        { kind: "heading", text: "How Rust eliminates four-and-a-half of the five" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "rule 01",
              value: "Ownership",
              desc: "Every allocation has a single owner. When the owner goes out of scope, the memory is freed exactly once. Double-free is impossible.",
            },
            {
              label: "rule 02",
              value: "Borrowing",
              desc: "A reference (&T or &mut T) must not outlive the owner it points at. The compiler tracks lifetimes and refuses to compile code that could leave a reference dangling.",
            },
            {
              label: "rule 03",
              value: "No null references",
              desc: "Safe references are never null. Optional pointers are written Option<&T> or Option<Box<T>>; you can't read them without first checking. Null dereference is impossible.",
            },
            {
              label: "rule 04",
              value: "Bounds-checked slices",
              desc: "Indexing into a slice is checked at runtime; out-of-bounds panics rather than corrupts. Pointer arithmetic on raw pointers is allowed only inside `unsafe`.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>The "half" Rust doesn't eliminate is memory <em>leaks</em>. You can still leak by holding a reference forever (an <code>Rc</code> cycle, a long-lived <code>Box::leak</code>). Leaks are safe in Rust's safety model; they're bugs but not <em>unsound</em> bugs.</p>`,
        },
        { kind: "heading", text: "The escape hatch: unsafe and raw pointers" },
        {
          kind: "prose",
          html: `<p>Sometimes Rust's rules are too restrictive. Talking to C code, writing a custom allocator, implementing a lock-free data structure, or reading memory-mapped hardware: all of these need raw pointers. Rust gives them to you. <code>*const T</code> and <code>*mut T</code> behave like C pointers. Dereferencing one requires an <code>unsafe</code> block, which is the language's way of saying "I, the programmer, promise this is sound; the compiler can no longer help."</p>
<p>The standard library is full of <code>unsafe</code> internally: <code>Vec</code>, <code>String</code>, <code>HashMap</code>, every reference-counted type. The point isn't that <code>unsafe</code> is forbidden; it's that <em>most</em> code can be written without it, and the parts that can't are explicitly marked so a reviewer can audit them.</p>`,
        },
        { kind: "heading", text: "Pointers connect every layer of this site" },
        {
          kind: "table",
          headers: ["layer", "where the pointer is"],
          rows: [
            [
              "Number systems",
              "Addresses are integers, almost always printed in hex.",
            ],
            [
              "Binary",
              "A 64-bit pointer is 8 bytes, little-endian on x86 and ARM.",
            ],
            [
              "ASCII",
              "<code>char *</code> is the most common pointer in C; <code>&amp;str</code> is its bounds-checked Rust cousin.",
            ],
            [
              "Logic gates",
              "Load and store instructions take an address. That address is gated onto the address bus.",
            ],
            [
              "CPU",
              "The program counter <em>is</em> a pointer (to the next instruction). So is the stack pointer.",
            ],
            [
              "Memory",
              "Pointers are how you navigate memory. Without them there is no stack, no heap, no indirection.",
            ],
            [
              "Operating system",
              "User pointers go through the MMU; the kernel resolves them to physical pages. Every syscall buffer is a pointer the kernel validates and copies through.",
            ],
            [
              "Variables",
              "Dynamic data (Vec, String, Box) is a small fixed-size header containing a pointer to a heap-allocated body.",
            ],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the punchline",
          body: `A pointer is the smallest unit of indirection in computing. Almost every interesting thing software does (data structures, polymorphism, dynamic memory, IPC, drivers, garbage collection, virtual memory itself) is some pattern of pointers on top of pointers. Understanding what they really are, where they live, and what makes them dangerous is the closest thing this site has to a single load-bearing skill.`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Pointers go deep. A few worthwhile rabbit holes:</p>
<ul>
  <li><strong>Smart pointers</strong> in Rust (<code>Box</code>, <code>Rc</code>, <code>Arc</code>, <code>RefCell</code>, <code>Cell</code>) and C++ (<code>unique_ptr</code>, <code>shared_ptr</code>, <code>weak_ptr</code>). Each one encodes a different ownership policy in the type system.</li>
  <li><strong>Pointer tagging</strong>: stealing the low bits of an aligned pointer to store extra data. The JVM, V8, and lots of GCs do this. Three free bits per word.</li>
  <li><strong>Address Sanitizer</strong>, <strong>Valgrind</strong>, <strong>Miri</strong>: tools that instrument C, C, and Rust respectively to catch use-after-free, leaks, and other pointer crimes at runtime.</li>
  <li><strong>The CHERI architecture</strong>: a CPU with hardware-enforced capabilities, where pointers carry bounds and permissions directly in their bit representation.</li>
</ul>
<p>Every one of those is a different angle on the same fundamental thing: a number that means somewhere.</p>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x0A",
    title: "When does each piece happen? Compile time vs runtime.",
    href: "/compile-vs-runtime",
    label: "compile vs runtime",
    variant: "magenta",
  },
};
