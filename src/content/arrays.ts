import type { PageContent } from "@/types/content";

const rustBasic = `fn main() {
    // A fixed-size array of five i32s. Type written [T; N].
    let scores: [i32; 5] = [91, 84, 78, 66, 100];

    // Indexing starts at 0. Out-of-bounds panics, never reads garbage.
    println!("first: {}", scores[0]);   // 91
    println!("last:  {}", scores[4]);   // 100

    // Iterating: idiomatic Rust uses iterators, not index loops.
    for (i, s) in scores.iter().enumerate() {
        println!("scores[{i}] = {s}");
    }

    // The whole array is 5 * 4 = 20 bytes on the stack.
    // No heap, no allocator, no pointer chase.
    println!("size in memory: {} bytes", std::mem::size_of_val(&scores));
}`;

const cBasic = `#include <stdio.h>

int main(void) {
    // Same array, declared in C.
    int scores[5] = {91, 84, 78, 66, 100};

    // Indexing starts at 0. C does NOT bounds-check; scores[99] is
    // legal at compile time and undefined at runtime.
    printf("first: %d\\n", scores[0]);   // 91
    printf("last:  %d\\n", scores[4]);   // 100

    for (int i = 0; i < 5; i++)
        printf("scores[%d] = %d\\n", i, scores[i]);

    printf("size in memory: %zu bytes\\n", sizeof scores);   // 20
    return 0;
}`;

const cPointerArith = `#include <stdio.h>

int main(void) {
    int arr[4] = {10, 20, 30, 40};

    // arr[i] is EXACTLY *(arr + i). The C language defines them equal.
    // The compiler turns the index into address arithmetic:
    //   1. multiply i by sizeof(int) = 4
    //   2. add to the base address of arr
    //   3. load 4 bytes from that address
    printf("%d\\n", arr[2]);          // 30
    printf("%d\\n", *(arr + 2));      // 30  -- same machine code
    printf("%d\\n", 2[arr]);          // 30  -- also legal, identical

    // Print each address. They're spaced exactly sizeof(int) apart
    // because the elements live contiguously in memory.
    for (int i = 0; i < 4; i++)
        printf("&arr[%d] = %p (val %d)\\n",
               i, (void*)&arr[i], arr[i]);

    return 0;
}`;

const rustPointerArith = `fn main() {
    let arr: [i32; 4] = [10, 20, 30, 40];

    // Rust's [] is bounds-checked. The same machine code as C
    // (load from base + i * 4) plus a runtime "is i < len" check.
    // Out-of-bounds panics; never reads adjacent memory.
    println!("{}", arr[2]);   // 30

    // Same 4-byte stride between consecutive elements.
    for i in 0..4 {
        println!("&arr[{}] = {:p} (val {})", i, &arr[i], arr[i]);
    }

    // Slice the middle two elements. A slice is (ptr, len), and
    // gives you the same fast indexing with the same safety check.
    let mid: &[i32] = &arr[1..3];
    println!("mid = {:?}", mid);   // [20, 30]

    // The line below would panic at runtime:
    //   let bad = arr[5];
    //   error: index out of bounds: the len is 4 but the index is 5
}`;

const cDynamic = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    // Heap-allocated array. The size is decided at runtime.
    int n = 10;
    int *arr = malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) arr[i] = i * i;

    // Indexing syntax is identical to a stack array. Underneath,
    // arr is just a pointer to the first byte of a contiguous block.
    printf("%d\\n", arr[3]);   // 9

    // Grow it. realloc may move the buffer to a bigger free region,
    // copy the old contents over, and free the old one. The pointer
    // can change, so we reassign.
    n = 20;
    arr = realloc(arr, n * sizeof(int));
    for (int i = 10; i < 20; i++) arr[i] = i * i;
    printf("%d\\n", arr[15]);  // 225

    free(arr);
    return 0;
}`;

const rustDynamic = `fn main() {
    // Vec<T> is the canonical growable array in Rust. Layout: a
    // (ptr, len, cap) header on the stack, pointing at a heap buffer.
    let mut arr: Vec<i32> = Vec::new();

    // push() is amortized O(1). When the heap buffer is full,
    // Vec doubles its capacity, memcpy's the old data over, and
    // frees the old buffer. The whole machinery is hidden.
    for i in 0..10 {
        arr.push(i * i);
    }

    println!("arr[3] = {}", arr[3]);   // 9
    println!("len = {}, cap = {}", arr.len(), arr.capacity());

    // A slice is the safe pointer for an array region. It's (ptr, len),
    // valid only while the source array is alive.
    let middle: &[i32] = &arr[3..7];
    println!("{:?}", middle);          // [9, 16, 25, 36]
}`;

export const arrays: PageContent = {
  slug: "arrays",
  hexLabel: "0x0B",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x0B / structure",
    title: `Houses on a<br><span class="highlight">numbered street.</span>`,
    lede: `An <strong>array</strong> is the simplest data structure there is: a row of identical boxes, packed next to each other in memory, addressed by number. From that single shape, every string, every image, every audio buffer, every hash table, every CPU's branch predictor table is built. Once you see how arrays really work, half of computer science gets cheaper to think about.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Arrays as a **numbered street**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Imagine a row of identical houses on one side of a street. Each house is the same size. Each has a number on its door: 0, 1, 2, 3, and so on. If a friend tells you "I'm in house 4", you don't have to walk past every house counting; you just look at the door numbers and go straight there. That's an array.</p>
<p>An <strong>array</strong> is:</p>
<ul>
  <li>A <strong>sequence</strong> of values, all of the <strong>same type</strong> (all integers, or all bytes, or all whatever).</li>
  <li>Each value sits in a numbered slot called an <strong>index</strong>.</li>
  <li>The slots are <strong>side by side</strong> in memory, in order.</li>
</ul>
<p>That's the whole idea. Every other property of arrays follows from those three.</p>`,
        },
        { kind: "heading", text: "A picture of an array in memory" },
        {
          kind: "diagram",
          name: "array-memory",
        },
        {
          kind: "prose",
          html: `<p>Five integers. Five slots. Each slot is 4 bytes wide because an integer is 4 bytes. The whole array takes 20 contiguous bytes in memory.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// off-by-one warning",
          body: `Arrays are <strong>zero-indexed</strong>. The first element is <code>arr[0]</code>, not <code>arr[1]</code>. The last element of a length-N array is <code>arr[N-1]</code>. This catches every programmer at least once, and pretty much always on the day you most want to ship.`,
        },
        { kind: "heading", text: "Declare, access, iterate" },
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
          title: "// the first divergence",
          body: `Both programs declare the same five integers and print them. Notice the size at the bottom: 20 bytes on the stack in both languages. But there's a quiet difference: <code>scores[99]</code> compiles fine in both languages and produces undefined behaviour in C while panicking cleanly in Rust. That gap is the rest of this page.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "How **indexing** actually works",
      blocks: [
        {
          kind: "prose",
          html: `<p>Why is <code>arr[5,000,000]</code> just as fast as <code>arr[0]</code>? Because the CPU doesn't walk through the array. It computes the address of the slot directly:</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">arr[i]  =  *(arr + i * sizeof(element))<br><br>For an array of 4-byte ints starting at 0x1000:<br>  arr[0] = load from 0x1000 + 0 * 4 = 0x1000<br>  arr[1] = load from 0x1000 + 1 * 4 = 0x1004<br>  arr[2] = load from 0x1000 + 2 * 4 = 0x1008<br>  arr[i] = load from 0x1000 + i * 4<br><br>One multiply, one add, one load. Constant time, no matter how big i is.</p>`,
        },
        {
          kind: "prose",
          html: `<p>That's the <strong>O(1)</strong> in "arrays have O(1) random access." The cost doesn't depend on the size of the array, only on the size of one element. Every other data structure (linked list, tree, hash table) tries to either match or hide this property.</p>`,
        },
        { kind: "heading", text: "Indexing is pointer arithmetic in disguise" },
        {
          kind: "prose",
          html: `<p>In C, the language makes this completely explicit. <code>arr[i]</code> is a literal synonym for <code>*(arr + i)</code>. The compiler will accept either one. It will also accept the cursed-but-legal <code>i[arr]</code>, because addition is commutative.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustPointerArith },
            c: { language: "c", code: cPointerArith },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the pointer page",
          body: `An array name in C decays to a pointer to its first element. So when you pass an array to a function, you're passing a pointer. The function has no way to know how long the array is unless you tell it. That's why every C function that takes an array also takes a length, and forgetting to use it correctly is the root of half the CVEs in the C standard library.`,
        },
        { kind: "heading", text: "C indexes blindly; Rust checks every time" },
        {
          kind: "prose",
          html: `<p>The machine-level operation is the same: multiply, add, load. The difference is what happens <em>before</em> the load.</p>`,
        },
        {
          kind: "table",
          headers: ["language", "what <code>arr[i]</code> does", "if <code>i</code> is out of bounds"],
          rows: [
            [
              "<strong>C</strong>",
              "Multiply, add, load. No check.",
              "Undefined behaviour. Could read adjacent memory, crash, or look fine and corrupt silently.",
            ],
            [
              "<strong>Rust (safe)</strong>",
              "Check that <code>i &lt; len</code>, then multiply, add, load.",
              "Panic with a clear message: <code>index out of bounds: the len is N but the index is i</code>.",
            ],
            [
              "<strong>Rust (unsafe, <code>get_unchecked</code>)</strong>",
              "Multiply, add, load. No check.",
              "Same UB as C. You opted in.",
            ],
          ],
        },
        {
          kind: "prose",
          html: `<p>That bounds check is a single compare-and-branch on a register that's almost always in cache. It costs essentially zero in tight loops because the branch predictor learns it always succeeds. The "cost" of Rust's safety, for arrays, is close to non-existent on real workloads.</p>`,
        },
        { kind: "heading", text: "Stack arrays vs heap arrays" },
        {
          kind: "diagram",
          name: "stack-vs-heap-array",
        },
        {
          kind: "prose",
          html: `<p>Two shapes, same indexing experience, different mechanics.</p>
<ul>
  <li>A <strong>stack array</strong> is the whole array, sitting in one block on the stack. Compile-time-known length. Freed automatically when the function returns. Zero allocator involvement.</li>
  <li>A <strong>heap array</strong> (Rust's <code>Vec</code>, C's <code>malloc</code>'d buffer) is a small fixed-size header on the stack pointing at a variable-size body on the heap. You can grow it. You pay for the allocator. You have to release it (manually in C, automatically when the owner drops in Rust).</li>
</ul>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustDynamic },
            c: { language: "c", code: cDynamic },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// how Vec grows",
          body: `Vec keeps a hidden <strong>capacity</strong> (how many slots the buffer can hold) separate from its <strong>length</strong> (how many are in use). Pushing into a full buffer doubles the capacity: allocate a new buffer twice as big, copy everything over, free the old one. That copy sounds expensive, but it happens rarely enough that the average cost per push works out to a constant. That's what "amortized O(1) push" means.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "**Cache lines**, layouts, and why arrays are everywhere",
      blocks: [
        { kind: "heading", text: "Cache locality: the real reason arrays win" },
        {
          kind: "prose",
          html: `<p>The CPU page covered the cache hierarchy: registers, L1, L2, L3, RAM. Each level is bigger and slower than the one above. When the CPU fetches memory from RAM, it doesn't fetch one byte. It fetches a <strong>cache line</strong> (typically 64 bytes) and parks the whole line in L1.</p>
<p>This is why arrays are obscenely fast to walk in order. The first read pulls in a 64-byte line containing the next 16 ints (or 8 doubles, or whatever). The next 15 reads hit cache. Zero memory stalls. The CPU's prefetcher even notices the pattern and starts pulling in the <em>next</em> line before you ask for it.</p>
<p>Now consider a linked list. Each node lives at a different address. Following <code>next</code> is a pointer chase. The CPU has no idea where the next node is until it reads the current one's <code>next</code> field. Cache prefetch can't help. Every step is a cache miss.</p>`,
        },
        {
          kind: "diagram",
          name: "array-vs-linked-list",
        },
        {
          kind: "prose",
          html: `<p>Same algorithmic complexity (O(n) to walk). Real-world: the array beats the linked list by 5 to 50 times. The difference is locality, not big-O.</p>`,
        },
        { kind: "heading", text: "Strings are arrays of bytes" },
        {
          kind: "prose",
          html: `<p>A string is not a special type. It's an array of bytes that happens to contain text. The ASCII page showed how each byte maps to a character; the string is just <em>a sequence of those bytes laid out contiguously</em>.</p>
<ul>
  <li>C strings: a <code>char *</code> pointing at a null-terminated array of bytes. <code>"hello"</code> in source is a 6-byte array (5 chars + a zero) in <code>rodata</code>.</li>
  <li>Rust <code>&amp;str</code>: a (pointer, length) pair. No null terminator. Guaranteed valid UTF-8 by the type system.</li>
  <li>Rust <code>String</code>: a heap-owned, growable byte array. Effectively a <code>Vec&lt;u8&gt;</code> with a UTF-8 guarantee.</li>
</ul>
<p>The reason Rust's string slicing rules feel finicky is that UTF-8 characters aren't all the same size, so "the third character" and "the third byte" are different questions. The array shape doesn't change; only the interpretation of its elements does.</p>`,
        },
        { kind: "heading", text: "Multidimensional arrays" },
        {
          kind: "prose",
          html: `<p>A 2D array, conceptually a grid, is in memory just a 1D array with a layout convention.</p>`,
        },
        {
          kind: "diagram",
          name: "row-vs-column-major",
          caption: "grid[2][3]: 2 rows × 3 cols, same data, two layouts",
        },
        {
          kind: "prose",
          html: `<p>This isn't pedantic; it affects performance dramatically. Walking a row-major matrix by rows hits cache nicely; walking it by columns thrashes cache. Matrix multiplication libraries (BLAS, cuBLAS) spend most of their cleverness on traversing in the right order for their target architecture.</p>`,
        },
        { kind: "heading", text: "Arrays as the universal foundation" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "data structures",
              value: "Built from arrays",
              desc: "Hash tables use arrays as buckets. Heaps and binary trees are often laid out flat in an array. Ring buffers and queues are arrays with two cursors. Most graphs are stored as arrays of adjacency lists.",
            },
            {
              label: "I/O & files",
              value: "Bytes in, bytes out",
              desc: "Every file is an array of bytes. Every network packet is an array of bytes. Every audio sample is a 16-bit array entry. Every image pixel is three or four bytes in a 2D array.",
            },
            {
              label: "the CPU itself",
              value: "Arrays in silicon",
              desc: "Register files, cache lines, branch prediction tables, page tables, GPU framebuffers: all arrays. The hardware has special instructions (SIMD: SSE, AVX, NEON) for processing many array elements in parallel.",
            },
            {
              label: "your program",
              value: "Stack frames",
              desc: "The call stack is itself an array. Each function's locals occupy contiguous slots in it. The 'stack' from the memory page is just an array with a moving pointer.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the mental model",
          body: `An array is the simplest possible answer to "I have N things of the same kind." The CPU is built to walk them quickly, the cache is built to feed them in chunks, the OS lays them out in contiguous virtual pages, and every higher-level data structure is either built on top of one, or trying to fake their performance. When in doubt, reach for an array first. Most of the time you won't need anything else.`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Arrays look simple but have rabbit holes a kilometre deep:</p>
<ul>
  <li><strong>SIMD</strong> (Single Instruction, Multiple Data). Special CPU instructions that operate on 4, 8, or 16 array elements at once. The <code>std::arch</code> module in Rust and intrinsics in C let you write hand-tuned hot loops.</li>
  <li><strong>Cache-oblivious algorithms</strong>. Sorting and matrix algorithms that beat cache-aware ones by recursive blocking, often without knowing the cache size.</li>
  <li><strong>The Folly &amp; Abseil libraries</strong>. Facebook's and Google's drop-in replacements for the C++ standard containers, with much better cache behaviour and growth strategies. The lessons apply to Rust and C too.</li>
  <li><strong>Apache Arrow</strong>. A columnar in-memory format for analytics that takes "arrays for everything" to its logical conclusion across language boundaries.</li>
  <li><strong>Data-Oriented Design</strong> (Mike Acton's talks). The game-engine philosophy of organising your data as arrays of fields, not arrays of structs, for maximum cache friendliness.</li>
</ul>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x0C",
    title: "Same idea, no neighbours. Linked lists trade locality for cheap inserts.",
    href: "/linked-list",
    label: "linked list",
    variant: "magenta",
  },
};
