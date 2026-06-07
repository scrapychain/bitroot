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

const cBitcoinChain = `/* Bitcoin block header pointer chain */
typedef struct Block {
    struct BlockHeader {
        uint32_t version;
        uint8_t  prev_hash[32]; /* pointer to previous block */
        uint8_t  merkle_root[32];
        uint32_t timestamp;
        uint32_t bits;
        uint32_t nonce;
    } header;
    /* transactions follow... */
} Block;

/* Following the chain - iterating via prev_hash */
void validate_chain(const Block *tip,
                    Block *(*find_block)(const uint8_t[32]))
{
    const Block *current = tip;
    while (current != NULL) {
        if (!validate_block(current)) {
            reject("invalid block");
            return;
        }
        /* follow the pointer to the previous block       */
        /* prev_hash is a content address, not memory addr */
        current = find_block(current->header.prev_hash);
        /* returns NULL at the genesis block */
    }
}`;

const rustBitcoinChain = `use std::collections::HashMap;

/* The blockchain as a linked list via content addresses */
struct Block {
    header: BlockHeader,
    transactions: Vec<Transaction>,
}

struct BlockHeader {
    version:     u32,
    prev_hash:   [u8; 32], // "pointer" to previous block
    merkle_root: [u8; 32],
    timestamp:   u32,
    bits:        u32,
    nonce:       u32,
}

struct Blockchain {
    blocks: HashMap<[u8; 32], Block>, // hash -> block
}

impl Blockchain {
    /* Follow prev_hash chain from tip to genesis */
    fn validate_chain(&self, tip_hash: &[u8; 32]) -> bool {
        let mut current_hash = tip_hash;
        let genesis = [0u8; 32]; // genesis has no parent

        loop {
            let block = match self.blocks.get(current_hash) {
                Some(b) => b,
                None    => return false, // block not found
            };

            if !self.validate_block(block) {
                return false;
            }

            // follow the prev_hash "pointer"
            current_hash = &block.header.prev_hash;

            if current_hash == &genesis { return true; }
        }
        // Rust: no dangling pointers possible.
        // prev_hash is a [u8; 32] value, not a raw pointer.
        // invalid hashes return None from the HashMap:
        // no use-after-free, no null dereference.
    }
}`;

export const pointers: PageContent = {
  slug: "pointers",
  hexLabel: "0x09",
  category: "indirection",
  hero: {
    eyebrow: "root.system / 0x09 / indirection",
    title: `A number<br><span class="highlight">that means somewhere.</span>`,
    lede: `A <strong>pointer</strong> is just an integer, the same kind covered on the binary page. What makes it different is the meaning we give it: this number is the <em>address</em> of something else in memory. Every dynamic data structure, every reference, every callback, every syscall buffer in your program is built from this single idea. So are most of the famous bugs in the history of software.`,
    narrativeHtml: `<p>The most powerful concept in programming has six letters.</p>
<p><strong>Pointer.</strong></p>
<p>It is also the most dangerous.</p>
<p>Every dynamic data structure.<br>Every recursive algorithm.<br>Every network socket.<br>Every file descriptor.<br>Every callback and virtual function.<br>Every kernel buffer and device register.</p>
<p>All of it is this one idea.</p>
<p>A number that happens to be an address.</p>
<p>You already know everything you need to understand it.</p>
<p>You know binary from page 2.<br>A pointer is a binary number.</p>
<p>You know memory from page 6.<br>Every byte has an address.</p>
<p>You know variables from page 8.<br>A variable stores a value.</p>
<p>A pointer is a variable whose value is an address.</p>
<p>That's it.<br>That's the whole thing.</p>
<p>The complexity comes not from what a pointer is. But from what happens when you get one wrong.</p>`,
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
          kind: "raw",
          html: `<p class="connection-line">That address in the pointer diagram. <code>0x4000</code>. Written in hex, because hex is how humans read binary addresses. A 64-bit pointer is eight bytes: eight bytes of binary, the same binary from page 2, the same hex from page 1. The only new thing is the meaning: this number points somewhere. <a href="/binary">← see: Binary</a> · <a href="/number-systems">Number Systems</a></p>`,
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
        { kind: "heading", text: "Follow the pointer" },
        { kind: "widget", name: "pointer-visualiser" },
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
        {
          kind: "raw",
          html: `<p class="connection-line">Reason three: recursive structures. A linked list node cannot contain itself, but it can contain a pointer to itself. A tree node cannot embed its children, but it can point to them. This is why every data structure page after this one depends on what you learn here. The arrays page does not need pointers. Every other data structure page does. <a href="/linked-list">← see: Linked Lists</a> · <a href="/hashing">Hashing</a></p>`,
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
        {
          kind: "raw",
          html: `<p class="connection-line">Every one of those five bugs is undefined behaviour in C. The compiler assumes they never happen; when they do, anything can happen. Heartbleed was a buffer over-read: a pointer walked two bytes past the end of an SSL record, and 64 kilobytes of server memory leaked to any attacker who asked. Certificates. Private keys. Passwords. All from one pointer that went too far. The compiler said nothing. The bug shipped. <a href="/operating-system">← see: Operating System</a> <span style="color:var(--fg-mute)">(the OS is written in C; these bugs are why Rust matters there)</span></p>`,
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
        { kind: "heading", text: "Pointers in Bitcoin" },
        {
          kind: "prose",
          html: `<p>Bitcoin is built on pointers. Not metaphorically. Literally.</p>`,
        },
        { kind: "heading", text: "The program counter" },
        {
          kind: "prose",
          html: `<p>When a Bitcoin node validates a new block, its CPU's program counter is a pointer to the next instruction in the Bitcoin Core binary.</p>
<p>Every SHA-256 round function call. Every ECDSA signature verification. Every UTXO lookup. The CPU fetches the instruction at that address, decodes it, executes it, increments the pointer, and repeats.</p>
<p>The program counter is the original pointer. Every program that has ever run is a CPU following a pointer through code.</p>`,
        },
        { kind: "heading", text: "The prev_hash pointer" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin block header contains <code>uint8_t prev_hash[32];</code>, a 32-byte field. This is Bitcoin's version of a pointer. Not a memory address: a cryptographic content address, the SHA-256 hash of the previous block.</p>
<p>In a regular linked list, <code>node-&gt;next</code> is a memory address. Change the node and the pointer still reaches it. In Bitcoin, <code>block.prev_hash</code> is a content hash. Change the block and the hash changes, the pointer breaks, every subsequent block is invalid, and the network detects the tamper instantly.</p>
<p>The blockchain is a linked list where the pointers are unforgeable.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitcoinChain },
            c: { language: "c", code: cBitcoinChain },
          },
        },
        { kind: "heading", text: "The five bugs in Bitcoin context" },
        {
          kind: "prose",
          html: `<p>The same five pointer bugs, inside a real Bitcoin node:</p>
<ul>
  <li><strong>Null dereference:</strong> following <code>prev_hash</code> of the genesis block, where no previous block exists. C: crash or undefined behaviour. Rust: <code>None</code> from the <code>HashMap</code>, handled explicitly.</li>
  <li><strong>Use-after-free:</strong> accessing a UTXO entry after it was spent and evicted from the UTXO set. C: returns garbage data from freed memory. Rust: the borrow checker prevents compilation.</li>
  <li><strong>Out-of-bounds:</strong> a malicious transaction script crafted with length fields that exceed the buffer. C: reads adjacent memory, Heartbleed-style. Rust: panics safely, no data leaked.</li>
</ul>
<p>These are not theoretical. Several Bitcoin protocol bugs in history were exactly these pointer bugs in C++ code. Rust in the Linux kernel and in Bitcoin infrastructure exists because of them.</p>`,
        },
        { kind: "heading", text: "Where pointers appear in ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>A pointer is the smallest unit of indirection in computing, so it shows up on nearly every other page. Here is where.</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            {
              label: "01 / number systems",
              value: "Addresses are hex",
              desc: "A memory address is a hex number like 0x7fff5fbff8d4. Hex because raw binary addresses would be unreadable; the number systems page explains why addresses are always written that way.",
              href: "/number-systems",
            },
            {
              label: "02 / binary",
              value: "8 bytes of binary",
              desc: "A 64-bit pointer is 8 bytes of binary stored in a register or on the stack. The binary page is what a pointer is actually made of at the lowest level.",
              href: "/binary",
            },
            {
              label: "03 / ascii",
              value: "char* is a pointer",
              desc: "char* in C is a pointer to the first byte of a string, and the string ends when a NUL byte (0x00) is found. Every C string is a pointer plus a contract.",
              href: "/ascii",
            },
            {
              label: "04 / logic gates",
              value: "Address lines are gates",
              desc: "Load and store instructions take an address, which is gated onto the address bus. Address lines are logic gates routing the binary address to the right memory cells.",
              href: "/logic-gates",
            },
            {
              label: "05 / cpu",
              value: "The program counter",
              desc: "The program counter is a pointer to the next instruction; the stack pointer points at the top of the call stack. Every call and return is the CPU following and updating pointers.",
              href: "/cpu",
            },
            {
              label: "06 / memory",
              value: "Structure over bytes",
              desc: "Without pointers, memory is just a flat array of bytes. Pointers are how you build structure on top of it; the memory page's regions only make sense with pointers connecting them.",
              href: "/memory",
            },
            {
              label: "07 / operating system",
              value: "Every syscall buffer",
              desc: "Every syscall argument is a pointer: in write(fd, buf, n), buf is a pointer the kernel validates and copies through. Every OS abstraction is a pointer with a permission check attached.",
              href: "/operating-system",
            },
            {
              label: "08 / variables",
              value: "Header plus pointer",
              desc: "Dynamic variables (Vec, String, Box) are a fixed-size header containing a pointer: the header on the stack, the pointer reaching the heap. Pointers in their most everyday form.",
              href: "/variables",
            },
            {
              label: "20 / recursion",
              value: "Return addresses",
              desc: "The return address on the call stack is a pointer to the instruction to run after a function returns. Buffer overflow attacks overwrite exactly this pointer. Recursion is pointer-chasing through code.",
              href: "/recursion",
            },
            {
              label: "11 / arrays",
              value: "arr[i] is arithmetic",
              desc: "arr[i] is pointer arithmetic: base_address + (i x element_size). The array is a pointer to its first element (arr == &arr[0]), so every access dereferences a pointer in one instruction.",
              href: "/arrays",
            },
            {
              label: "12 / linked lists",
              value: "Every node points",
              desc: "Every node holds a pointer: struct Node { int value; Node *next; }. The list only exists because of that pointer, and each dereference is a potential cache miss this page explains.",
              href: "/linked-list",
            },
            {
              label: "13 / hashing",
              value: "Buckets are pointers",
              desc: "A hash map uses pointers internally: each bucket may point to a linked list of entries (chaining). Its O(1) lookup follows exactly one pointer in the best case.",
              href: "/hashing",
            },
            {
              label: "15 / networking",
              value: "Sockets are descriptors",
              desc: "A socket is a file descriptor, an integer the OS uses as a pointer into its socket table. Every send() and recv() takes a buffer pointer the kernel validates before touching user memory.",
              href: "/networking",
            },
            {
              label: "19 / blockchain",
              value: "prev_hash is a pointer",
              desc: "Bitcoin's prev_hash is a pointer, not a memory address but a cryptographic content address. Change the block and the hash changes, the pointer breaks, and the chain is provably invalid.",
              href: "/blockchain",
            },
            {
              label: "21 / big o",
              value: "O(1) with a catch",
              desc: "Following a pointer is O(1), but cache misses make it feel like more. A linked list traversal is O(n) by the algorithm, yet each dereference can stall the CPU ~200 cycles waiting for RAM.",
              href: "/big-o",
            },
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
  connections: {
    items: [
      {
        slug: "memory",
        text: `A pointer is a memory address, nothing more. The memory page is the street; a pointer is a house number on a slip of paper. This page only makes sense on top of that one.`,
      },
      {
        slug: "variables",
        text: `A pointer variable holds an address instead of a value. The variables page is where the name lives; this page is where the name points somewhere else.`,
      },
      {
        slug: "arrays",
        text: `<code>arr[i]</code> is pointer arithmetic in disguise: base address plus i times the element size. The arrays page is the friendly face of the pointer math here.`,
      },
      {
        slug: "linked-list",
        text: `A linked list is pointers made into a structure. Each node holds a <code>next</code> pointer to the following node. The linked-list page is this page chained together.`,
      },
      {
        slug: "cpu",
        text: `The program counter is a pointer to the next instruction. The CPU spends every cycle following pointers through memory. The CPU page runs on this page.`,
      },
      {
        slug: "hashing",
        text: `A chained hash map is an array of pointers, each the head of a linked list. The cost of following them is exactly what this page describes, which is why open addressing drops them.`,
      },
      {
        slug: "compile-vs-runtime",
        text: `A null dereference is a runtime crash; Rust's borrow checker turns many pointer bugs into compile-time errors. The compile-vs-runtime page is early catch versus production catch.`,
      },
      {
        slug: "operating-system",
        text: `Crossing the kernel boundary means handing the OS a pointer to your buffer. A bad pointer there is a segfault. The OS page is the strictest user of this one.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x0A",
    title: "When does each piece happen? Compile time vs runtime.",
    href: "/compile-vs-runtime",
    label: "compile vs runtime",
    variant: "magenta",
  },
};
