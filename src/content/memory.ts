import type { PageContent } from "@/types/content";

const rustReadWrite = `// Memory is just a giant array of bytes, addressed by number.
// In Rust, you usually access it through references, but
// raw addresses are right there if you ask for them.
fn main() {
    let x: u32 = 0xDEADBEEF;
    let addr: *const u32 = &x;

    println!("value at the address: 0x{:08X}", x);
    println!("the address itself:   {:p}", addr);

    // Read the four individual bytes of x from memory
    // (little-endian on x86/ARM, see the binary page).
    unsafe {
        let bytes = std::slice::from_raw_parts(addr as *const u8, 4);
        for (i, b) in bytes.iter().enumerate() {
            println!("byte {i} @ {:p} = 0x{:02X}", bytes.as_ptr().add(i), b);
        }
    }
}`;

const cReadWrite = `#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint32_t x = 0xDEADBEEF;
    uint32_t *addr = &x;

    printf("value at the address: 0x%08X\\n", x);
    printf("the address itself:   %p\\n", (void*)addr);

    // Read the four individual bytes of x from memory.
    uint8_t *bytes = (uint8_t*)addr;
    for (int i = 0; i < 4; i++)
        printf("byte %d @ %p = 0x%02X\\n",
               i, (void*)(bytes + i), bytes[i]);
    return 0;
}`;

const rustStackHeap = `fn main() {
    // STACK: known size, lifetime tied to the function.
    let arr: [u8; 4] = [10, 20, 30, 40];
    println!("stack arr   @ {:p}", arr.as_ptr());

    // HEAP: Box puts a value on the heap, frees it on drop.
    let boxed: Box<u32> = Box::new(0xCAFEBABE);
    println!("heap u32    @ {:p}", &*boxed);

    // HEAP: Vec is a (ptr, len, cap) header on the stack
    // pointing at a buffer on the heap.
    let v: Vec<u8> = vec![1, 2, 3, 4];
    println!("vec header  @ {:p}  buffer @ {:p}",
             &v, v.as_ptr());

    // Both heap allocations are freed automatically when
    // \`boxed\` and \`v\` go out of scope. No malloc, no free.
}`;

const cStackHeap = `#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    // STACK
    uint8_t arr[4] = {10, 20, 30, 40};
    printf("stack arr   @ %p\\n", (void*)arr);

    // HEAP: malloc returns a pointer, you must free it.
    uint32_t *boxed = malloc(sizeof *boxed);
    *boxed = 0xCAFEBABE;
    printf("heap u32    @ %p\\n", (void*)boxed);

    // HEAP: explicit array
    uint8_t *buf = malloc(4 * sizeof *buf);
    memcpy(buf, (uint8_t[]){1, 2, 3, 4}, 4);
    printf("heap buf    @ %p\\n", (void*)buf);

    free(boxed);
    free(buf);   // forget either of these and you have a leak.
    return 0;
}`;

const rustOwnership = `// The compiler tracks who owns each piece of memory.
// Use-after-free becomes a compile-time error, not a runtime crash.

fn main() {
    let s = String::from("hello"); // s owns the heap buffer

    let r = &s;                    // r borrows s, immutably
    println!("{r}");

    drop(s);                       // s is dropped, buffer freed

    // println!("{r}");            // ← would not compile:
    //                             //   borrow of moved value
}

// In contrast, the equivalent C code (next block) compiles
// happily and prints garbage, or crashes, depending on the day.`;

const cOwnership = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *s = malloc(6);
    strcpy(s, "hello");
    char *r = s;          // both pointers alias the same buffer

    printf("%s\\n", r);    // fine, prints "hello"

    free(s);              // buffer is now invalid memory
    printf("%s\\n", r);    // USE-AFTER-FREE: undefined behaviour.
                          // No compiler warning. No runtime check.
                          // Might print "hello", might segfault,
                          // might leak whatever the allocator
                          // wrote into those bytes next.
    return 0;
}`;

export const memory: PageContent = {
  slug: "memory",
  hexLabel: "0x06",
  category: "memory",
  hero: {
    eyebrow: "root.system / 0x06 / memory",
    title: `A wall of switches.<br><span class="highlight">Numbered.</span>`,
    lede: `The CPU on the previous page only works because it has somewhere to <em>put things</em>. That somewhere is <strong>memory</strong>: a long array of bit-cells with a number stamped on each one. Programs are bytes in memory. Variables are bytes in memory. The page you're reading is bytes in memory. This page is about how that array is built, how it's organized, and how programs actually use it.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What **memory** is",
      blocks: [
        {
          kind: "prose",
          html: `<p>You already saw, on the logic-gates page, that two NOR gates wired in a loop form an <strong>SR latch</strong>: a circuit with two stable states. That's a 1-bit memory cell. Tile millions of those side by side, give each one a unique number, and you've built memory. Each number is an <strong>address</strong>. Each cell holds a <strong>bit</strong>. Bits are grouped into <strong>bytes</strong> of 8.</p>
<p>The CPU talks to memory through two buses (literally, bundles of wires):</p>
<ul>
  <li>The <strong>address bus</strong>: "give me the byte at address 0x4000."</li>
  <li>The <strong>data bus</strong>: "here it is, <code>0x48</code>" (which, by the ASCII page, is the letter <code>H</code>).</li>
</ul>
<p>That's the whole interface. Read or write, one byte (or word) at a time, addressed by a number.</p>`,
        },
        { kind: "heading", text: "RAM vs ROM: volatile and non-volatile" },
        {
          kind: "prose",
          html: `<p>There are two big families of memory, and they differ on one question: <em>does the data survive when the power goes off?</em></p>`,
        },
        {
          kind: "table",
          headers: ["family", "what's it made of", "survives power off?", "where you find it"],
          rows: [
            [
              "<strong>RAM</strong> (Random Access Memory)",
              "transistors + capacitors (DRAM) or flip-flops (SRAM)",
              "no, contents lost",
              "main memory, CPU caches, registers",
            ],
            [
              "<strong>ROM</strong> (Read-Only Memory)",
              "fused / mask-programmed cells",
              "yes",
              "boot firmware, embedded device microcode",
            ],
            [
              "<strong>Flash</strong> (a.k.a. EEPROM)",
              "floating-gate transistors",
              "yes",
              "SSDs, USB sticks, phone storage",
            ],
          ],
        },
        {
          kind: "prose",
          html: `<p>"RAM" really means two things in everyday speech: <em>the kind of memory that loses its contents</em>, and <em>the main memory chip in your laptop</em> (which happens to be that kind). Inside the CPU, the registers and caches are <em>also</em> RAM, just smaller, faster, and made of SRAM cells (flip-flops, like the ones we built on the logic-gates page). Main memory uses <strong>DRAM</strong>, which trades speed for density: each cell is just one transistor and one capacitor.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the memory hierarchy",
          body: `Smaller and faster as you climb: <strong>registers</strong> (a few hundred bytes, 1 cycle) → <strong>L1/L2/L3 cache</strong> (KB to MB, single-digit to tens of cycles) → <strong>main RAM</strong> (GB, ~200 cycles) → <strong>SSD/disk</strong> (TB, millions of cycles). The CPU page covers cache in detail.`,
        },
        { kind: "heading", text: "Reading and writing bytes by address" },
        {
          kind: "prose",
          html: `<p>From inside a program, "memory" is just a numeric address you can read from or write to. In Rust most accesses go through safe references; in C they're literally pointers (numbers). Both compile down to the same load and store instructions the CPU runs.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustReadWrite },
            c: { language: "c", code: cReadWrite },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// remember from page 1?",
          body: `The four bytes of <code>0xDEADBEEF</code> show up in memory as <code>EF BE AD DE</code> on x86 / ARM. That's <strong>little-endian</strong>, the same byte order from the binary page. Memory layout and number representation are the same story.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "**Stack** &amp; heap: how programs use memory",
      blocks: [
        {
          kind: "prose",
          html: `<p>When the OS launches your program, it hands it a private chunk of address space and divides it into named regions. Two of those regions handle almost all of the runtime data your program touches: the <strong>stack</strong> and the <strong>heap</strong>.</p>`,
        },
        {
          kind: "diagram",
          name: "address-space",
        },
        { kind: "heading", text: "The stack: automatic, LIFO, free" },
        {
          kind: "prose",
          html: `<p>Every time a function is called, the CPU bumps a register called the <strong>stack pointer</strong> down by however many bytes that function's locals need. When the function returns, the pointer goes back up. That's it. There's no allocator running, no bookkeeping, just one register move. <em>That's</em> why stack allocation is essentially free.</p>
<p>The price: stack memory has a <strong>fixed lifetime</strong> tied to the function call. You can't return a pointer to a stack local and expect it to still be valid. The moment the function returns, that memory is up for grabs by the next call.</p>`,
        },
        { kind: "heading", text: "The heap: explicit, flexible, slow" },
        {
          kind: "prose",
          html: `<p>When you don't know the size at compile time, or you need the data to outlive the function that creates it, you go to the <strong>heap</strong>. The heap is managed by an <strong>allocator</strong>: a chunk of code (in libc, in the Rust runtime, etc.) that hands out free regions on request and tracks which ones are in use. <code>malloc</code>, <code>Box::new</code>, <code>Vec</code>, <code>String</code>: all of them ultimately call into the allocator.</p>
<p>That bookkeeping has a real cost. A heap allocation is hundreds to thousands of cycles where a stack allocation is one. So a rule of thumb in performance-sensitive code: <em>prefer the stack when you can</em>.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustStackHeap },
            c: { language: "c", code: cStackHeap },
          },
        },
        { kind: "heading", text: "Pointers are just numbers" },
        {
          kind: "prose",
          html: `<p>A pointer is an address. An address is a number. On a 64-bit system, that number is 8 bytes wide, which is why <code>sizeof(void*)</code> is 8 there. The CPU has no special "pointer" type; load and store instructions take addresses, full stop. The <em>type</em> attached to a pointer is a fiction the compiler enforces to make sure you don't read 8 bytes from a place where only 4 live.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "stack",
              value: "automatic",
              desc: "Allocation = move SP. Deallocation = move it back. Lifetime tied to the function.",
            },
            {
              label: "heap",
              value: "explicit",
              desc: "Allocation = ask the allocator. Deallocation = give it back (or be tracked by the runtime).",
            },
            {
              label: "static",
              value: "forever",
              desc: "Globals and string literals live in DATA / TEXT for the entire process lifetime.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the classic stack mistake",
          body: `Returning a pointer or reference to a local variable. The function returns, the stack frame is reclaimed, your pointer now points to whatever junk the next call writes there. C lets you do this; Rust catches it at compile time as a lifetime error.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Virtual memory, **safety** &amp; how languages model it",
      blocks: [
        { kind: "heading", text: "Virtual memory: every process gets its own universe" },
        {
          kind: "prose",
          html: `<p>If two programs both write to address <code>0x4000</code>, do they trample each other? They don't, because the address you see in your program isn't a real physical address at all. It's a <strong>virtual address</strong>. Between your program and the RAM chip sits a piece of CPU hardware called the <strong>MMU</strong> (memory management unit), which translates virtual addresses to physical ones using a per-process lookup table maintained by the OS.</p>
<p>This buys three properties at once:</p>
<ul>
  <li><strong>Isolation.</strong> Process A literally can't address process B's pages.</li>
  <li><strong>Lazy allocation.</strong> A 1 GB <code>malloc</code> doesn't actually consume 1 GB of RAM; pages are mapped on first touch.</li>
  <li><strong>Swapping.</strong> Pages that haven't been touched recently can be written to disk and reloaded transparently.</li>
</ul>`,
        },
        { kind: "heading", text: "Cache locality, restated" },
        {
          kind: "prose",
          html: `<p>The CPU page covered the cache hierarchy in detail. The takeaway, restated as a memory-layout principle: <strong>data laid out contiguously is dramatically faster to read</strong>. A <code>Vec&lt;Foo&gt;</code> beats a <code>Vec&lt;Box&lt;Foo&gt;&gt;</code>. An array-of-structs beats a struct-of-pointers. Same algorithmic complexity, often a 5 to 50× wall-time difference, because the first one streams cleanly through L1 and the second one pointer-chases through main memory.</p>`,
        },
        { kind: "heading", text: "The four classic memory bugs" },
        {
          kind: "table",
          headers: ["bug", "what happens", "what causes it"],
          rows: [
            [
              "<strong>Use-after-free</strong>",
              "Read or write through a pointer to memory that's already been released",
              "Freeing memory while another pointer to it still exists",
            ],
            [
              "<strong>Double free</strong>",
              "Allocator's internal bookkeeping corrupts; later allocations crash or alias",
              "Calling <code>free()</code> twice on the same pointer",
            ],
            [
              "<strong>Buffer overflow</strong>",
              "Overwrite adjacent variables, return addresses, control flow. Classic exploit vector.",
              "Writing past the end of an array",
            ],
            [
              "<strong>Memory leak</strong>",
              "Process slowly grows until OOM; long-running services restart on a schedule to mitigate",
              "Allocating without ever freeing",
            ],
          ],
        },
        { kind: "heading", text: "Three strategies for memory safety" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "01 / manual",
              value: "C, C++",
              desc: "You allocate, you free. Maximum control, maximum performance, every memory bug above is on the table. Decades of CVEs are buffer overflows in C.",
            },
            {
              label: "02 / garbage collection",
              value: "Java, Go, Python, JS",
              desc: "A runtime traces which heap objects are still reachable from live references and reclaims the rest. Safe, at the cost of a runtime, GC pauses, and less control over layout.",
            },
            {
              label: "03 / ownership",
              value: "Rust",
              desc: "Each value has a single owner. The compiler tracks lifetimes statically and refuses to compile code that could free memory that's still referenced. No runtime cost, no GC pauses.",
            },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustOwnership },
            c: { language: "c", code: cOwnership },
          },
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// undefined behaviour is a real thing",
          body: `Use-after-free in C isn't "the program will crash." It's <strong>undefined behaviour</strong>, which means the compiler is allowed to assume it never happens. Optimisers exploit that assumption, so the resulting program can do <em>anything</em>: print the right answer in debug, segfault in release, leak data over the network, run an attacker's code. UB is the source of most exploits on this list: <a class="inline-link" href="https://www.cve.org/" target="_blank" rel="noopener">cve.org</a>.`,
        },
        { kind: "heading", text: "Connecting the whole stack" },
        {
          kind: "callout",
          variant: "info",
          title: "// from electron to executable, with state",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li><strong>Transistors</strong> form <strong>flip-flops</strong> and <strong>DRAM cells</strong>.</li>
  <li>Tiled and addressed, those become <strong>memory chips</strong>: registers, caches, RAM.</li>
  <li>The <strong>CPU</strong> reads instructions and data from memory using load/store ops.</li>
  <li>Bits in memory encode <strong>numbers</strong> (page 1) and <strong>characters</strong> (page 2).</li>
  <li>The OS gives each process its own <strong>virtual address space</strong>, divided into stack, heap, data, text.</li>
  <li>Your <strong>language</strong> picks a strategy for managing it: manual, GC, or ownership.</li>
  <li>Your <strong>program</strong> is, ultimately, a sequence of reads and writes to specific addresses.</li>
</ol>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>You now have the whole vertical, including state. Next stops:</p>
<ul>
  <li><strong>What Every Programmer Should Know About Memory</strong>, Ulrich Drepper's canonical paper on caches, NUMA, and access patterns.</li>
  <li><strong>The Linux process memory map</strong>: read <code>/proc/&lt;pid&gt;/maps</code> on a running process and watch the regions above appear in the wild.</li>
  <li><strong>Rustonomicon</strong>, the dark-arts companion to the Rust book, on lifetimes, aliasing, and unsafe.</li>
  <li><strong>The Garbage Collection Handbook</strong> by Jones, Hosking &amp; Moss, the reference text on GC algorithms.</li>
</ul>
<p>And with that, the loop closes. You started at the bit. You've now seen everything between the bit and the program: the encodings on top of it, the gates beneath it, the CPU that orchestrates it, and the memory that holds all of it together.</p>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x07",
    title: "One CPU, many programs: how an operating system makes that work",
    href: "/operating-system",
    label: "operating system",
    variant: "magenta",
  },
};
