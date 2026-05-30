import type { PageContent } from "@/types/content";

const rustBeginner = `// Each function below has a different Big O.
// Same types, same inputs, radically different scales.

// O(1): constant time. 10 or 10 billion elements, same cost.
fn first_element(arr: &[i32]) -> Option<i32> {
    arr.first().copied()
    // one operation; the array size is irrelevant
}

// O(n): linear time. Every element visited once.
fn linear_search(arr: &[i32], target: i32) -> Option<usize> {
    for (i, &val) in arr.iter().enumerate() {
        if val == target { return Some(i); }
    }
    None
    // worst case: target is last or absent, n comparisons
}

// O(n²): quadratic. For every element, visit every other.
fn has_duplicate(arr: &[i32]) -> bool {
    for i in 0..arr.len() {
        for j in (i + 1)..arr.len() {
            if arr[i] == arr[j] { return true; }
        }
    }
    false
    // n × n comparisons; 10,000 elements = 50 million
}

// O(log n): binary search. Sorted input, halve each step.
fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    let (mut lo, mut hi) = (0, arr.len());
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        match arr[mid].cmp(&target) {
            std::cmp::Ordering::Equal   => return Some(mid),
            std::cmp::Ordering::Less    => lo = mid + 1,
            std::cmp::Ordering::Greater => hi = mid,
        }
    }
    None
    // 1 billion elements: at most 30 iterations
}`;

const cBeginner = `#include <stddef.h>
#include <stdint.h>

/* O(1): constant */
int first_element(const int *arr, size_t n) {
    if (n == 0) return -1;
    return arr[0];               /* one read, regardless of n */
}

/* O(n): linear */
int linear_search(const int *arr, size_t n, int target) {
    for (size_t i = 0; i < n; i++)
        if (arr[i] == target) return (int)i;
    return -1;                   /* worst case: n comparisons */
}

/* O(n²): quadratic */
int has_duplicate(const int *arr, size_t n) {
    for (size_t i = 0; i < n; i++)
        for (size_t j = i + 1; j < n; j++)
            if (arr[i] == arr[j]) return 1;
    return 0;                    /* n × n/2 comparisons */
}

/* O(log n): binary search (array must be sorted) */
int binary_search(const int *arr, size_t n, int target) {
    size_t lo = 0, hi = n;
    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if      (arr[mid] == target) return (int)mid;
        else if (arr[mid] <  target) lo = mid + 1;
        else                          hi = mid;
    }
    return -1;                   /* log2(1e9) is about 30 steps */
}`;

const rustDup = `use std::collections::HashSet;

// O(n²): check every pair. Simple, slow at scale.
fn has_dup_quadratic(arr: &[i32]) -> bool {
    for i in 0..arr.len() {
        for j in (i + 1)..arr.len() {
            if arr[i] == arr[j] { return true; }
        }
    }
    false
    // n = 10,000 -> 50 million comparisons
}

// O(n log n): sort first, then scan neighbours.
fn has_dup_sort(arr: &[i32]) -> bool {
    let mut sorted = arr.to_vec();
    sorted.sort_unstable();                  // O(n log n)
    sorted.windows(2).any(|w| w[0] == w[1])  // O(n)
    // total: O(n log n) time, O(n) space for the copy
}

// O(n): a hash set. Spend memory to buy speed.
fn has_dup_hash(arr: &[i32]) -> bool {
    let mut seen = HashSet::with_capacity(arr.len());
    arr.iter().any(|x| !seen.insert(x))
    // O(1) insert per element, O(n) total
    // n = 10,000,000 -> 10 million ops, not 50 trillion
}`;

const cDup = `#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

/* O(n²): nested loops */
int has_dup_quadratic(const int *arr, size_t n) {
    for (size_t i = 0; i < n; i++)
        for (size_t j = i + 1; j < n; j++)
            if (arr[i] == arr[j]) return 1;
    return 0;
}

/* O(n log n): sort then scan */
static int cmp_int(const void *a, const void *b) {
    return (*(const int*)a > *(const int*)b)
         - (*(const int*)a < *(const int*)b);
}
int has_dup_sort(const int *arr, size_t n) {
    int *copy = malloc(n * sizeof *copy);
    if (!copy) return -1;
    memcpy(copy, arr, n * sizeof *copy);
    qsort(copy, n, sizeof *copy, cmp_int);   /* O(n log n) */
    int found = 0;
    for (size_t i = 1; i < n; i++)
        if (copy[i] == copy[i - 1]) { found = 1; break; }
    free(copy);
    return found;
}

/* O(n) average: open-addressing hash set */
#define HASH_SIZE (1 << 20)   /* power of two for fast modulo */
int has_dup_hash(const int *arr, size_t n) {
    int *table = malloc(HASH_SIZE * sizeof *table);
    if (!table) return -1;
    for (size_t i = 0; i < HASH_SIZE; i++) table[i] = INT_MIN;

    int found = 0;
    for (size_t i = 0; i < n && !found; i++) {
        unsigned slot = (unsigned)arr[i] & (HASH_SIZE - 1);
        while (table[slot] != INT_MIN) {
            if (table[slot] == arr[i]) { found = 1; break; }
            slot = (slot + 1) & (HASH_SIZE - 1);   /* probe */
        }
        if (!found) table[slot] = arr[i];
    }
    free(table);
    return found;                /* O(1) per element average */
}`;

const rustAmort = `// Dynamic array growth: the canonical amortised O(1).
fn amortised_example() {
    let mut v: Vec<i32> = Vec::new(); // capacity starts at 0

    for i in 0..16 {
        v.push(i);
        // capacity doubles when full: 0 -> 1 -> 2 -> 4 -> 8 -> 16
        // each doubling copies all elements (an O(n) spike)
        // but spread over all pushes, it averages to O(1)
        println!("len={:2} cap={:2}", v.len(), v.capacity());
    }
    // total copies across 16 pushes: 1+2+4+8 = 15
    // average extra work per push: about 1 copy
    // O(1) amortised
}`;

const cAmort = `#include <stdlib.h>

typedef struct {
    int    *data;
    size_t  len;
    size_t  cap;
} DynArray;

void push(DynArray *a, int val) {
    if (a->len == a->cap) {
        /* capacity exhausted: double it */
        size_t new_cap = a->cap ? a->cap * 2 : 1;
        a->data = realloc(a->data, new_cap * sizeof *a->data);
        /* this realloc is O(n), but it happens rarely;
         * amortised over all pushes it is O(1) */
        a->cap = new_cap;
    }
    a->data[a->len++] = val;
}`;

const rustMine = `use sha2::{Sha256, Digest};

// O(1): compute SHA-256. Always 64 rounds, any input.
fn hash_block(data: &[u8; 32]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(data);
    h.finalize().into()
    // fixed operations regardless of content
}

// O(1): verify. Same cost as computing, then compare.
fn verify_hash(data: &[u8; 32], expected: &[u8; 32]) -> bool {
    hash_block(data) == *expected
}

// O(2^difficulty): mining. No algorithm, only brute force.
fn mine(mut header: [u8; 32], difficulty: u32) -> ([u8; 32], u64) {
    let mut nonce: u64 = 0;
    loop {
        header[24..32].copy_from_slice(&nonce.to_le_bytes());
        let hash = hash_block(&header);
        if hash[0..(difficulty / 8) as usize].iter().all(|&b| b == 0) {
            return (hash, nonce);
        }
        nonce += 1;
        // average iterations: 2^difficulty
        // Bitcoin's current difficulty is around 2^70
    }
}`;

const cMine = `#include <stdint.h>
#include <string.h>
#include <openssl/sha.h>

/* O(1): fixed 64-round SHA-256 */
void hash_block(const uint8_t in[32], uint8_t out[32]) {
    SHA256(in, 32, out);
}

/* O(1): verify */
int verify_hash(const uint8_t data[32], const uint8_t expected[32]) {
    uint8_t computed[32];
    hash_block(data, computed);
    return memcmp(computed, expected, 32) == 0;
}

/* O(2^difficulty): no algorithm, only the loop */
uint64_t mine(uint8_t header[32], uint32_t difficulty) {
    uint64_t nonce = 0;
    uint8_t  hash[32];
    uint32_t zero_bytes = difficulty / 8;

    for (;;) {
        memcpy(header + 24, &nonce, 8);
        hash_block(header, hash);

        int valid = 1;
        for (uint32_t i = 0; i < zero_bytes; i++)
            if (hash[i] != 0) { valid = 0; break; }
        if (valid) return nonce;
        nonce++;
        /* about 2^70 iterations on average */
    }
}`;

export const bigO: PageContent = {
  slug: "big-o",
  hexLabel: "0x15",
  category: "technique",
  hero: {
    eyebrow: "root.system / 0x15 / big-o",
    title: `Same answer.<br><span class="highlight">317 years apart.</span>`,
    lede: `Two programs. Both correct. Both return the right result. One finishes in a second. One finishes after the sun has died. The difference is not the hardware, not the language. It is the shape of the algorithm. Big O is how you describe that shape, and once you can read it you see the skeleton of every system ever built.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What Big O actually **measures**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Big O is not about speed. Most people get this wrong immediately. Big O is not about how fast your code runs; it is about how your code <em>scales</em>. What happens when the input doubles? Does the time double? Quadruple? Barely change? Explode? That question is what Big O answers.</p>
<p>You already know every data structure where this matters: arrays, linked lists, hash maps, recursion, hashing, the blockchain. Big O is the thread that runs through all of them, the lens that makes the curriculum coherent, and the tool that separates programmers who write correct code from programmers who write correct code that actually works at scale.</p>`,
        },
        {
          kind: "prose",
          html: `<p>Big O notation describes how the number of operations in an algorithm grows relative to the size of its input. Not the exact number: the growth rate, the shape of the curve, as input approaches infinity.</p>`,
        },
        { kind: "heading", text: "The complexity classes, fastest to slowest" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "O(1) · constant",
              value: "Input doubles, time unchanged",
              desc: "A fixed number of steps regardless of input size. Array index access, hash map lookup, reading the first element. The most powerful complexity class: achieve it whenever you can.",
            },
            {
              label: "O(log n) · logarithmic",
              value: "Input doubles, one more step",
              desc: "Eliminates half the possibilities on each step. Binary search, balanced BST lookup. 1 billion elements is 30 steps; 2 billion is 31. The most underrated complexity in computing.",
            },
            {
              label: "O(n) · linear",
              value: "Input doubles, time doubles",
              desc: "Visits each element once. Reading an array, linear search, printing every element. Fair, predictable, often unavoidable.",
            },
            {
              label: "O(n log n) · linearithmic",
              value: "Input doubles, slightly more than doubles",
              desc: "Merge sort, quicksort, heap sort. The best possible for comparison-based sorting: this is the sorting ceiling. Fast in practice, elegant in theory.",
            },
            {
              label: "O(n²) · quadratic",
              value: "Input doubles, time quadruples",
              desc: "Bubble sort, nested loops, comparing every pair. 1,000 elements is a million operations; 10,000 is a hundred million. A warning sign in production code.",
            },
            {
              label: "O(2ⁿ) · exponential",
              value: "Input plus one, time doubles",
              desc: "Naive recursive Fibonacci, brute-force cracking, subset enumeration. 30 elements is a billion operations; 64 is more than the atoms in the universe. The complexity class of doom.",
            },
            {
              label: "O(n!) · factorial",
              value: "The boundary of the impossible",
              desc: "Travelling-salesman brute force. 20 cities is 2.4 quintillion routes. Never acceptable at scale; it exists to mark the edge of what is computationally possible.",
            },
          ],
        },
        { kind: "heading", text: "How they grow" },
        {
          kind: "table",
          headers: ["n", "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
          rows: [
            ["1", "1", "1", "1", "1", "1", "2"],
            ["10", "1", "3", "10", "33", "100", "1,024"],
            ["100", "1", "7", "100", "664", "10,000", "1.3 × 10³⁰"],
            ["1,000", "1", "10", "1,000", "9,966", "1,000,000", "10³⁰¹"],
            ["10,000", "1", "13", "10,000", "132,877", "100,000,000", "10³⁰¹⁰"],
          ],
        },
        { kind: "heading", text: "The four rules" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "rule 1",
              value: "Drop constants",
              desc: "O(2n) is O(n). O(5n²) is O(n²). We care about growth rate, not multipliers. The constant depends on the machine; the growth rate does not.",
            },
            {
              label: "rule 2",
              value: "Drop lower-order terms",
              desc: "O(n² + n) is O(n²). For large n the dominant term swallows the rest. At n = 1,000,000, n² is 10¹² and n is 10⁶: the n is irrelevant.",
            },
            {
              label: "rule 3",
              value: "Worst case by default",
              desc: "O(n) for linear search means the worst case: the element is last. Best case it is first, O(1). We design for the worst case, because that is what users eventually hit.",
            },
            {
              label: "rule 4",
              value: "Space complexity exists too",
              desc: "Not just time. O(1) space uses fixed memory regardless of input; O(n) space grows with it. Recursive algorithms often use O(n) space for the call stack.",
            },
          ],
        },
        { kind: "heading", text: "Four complexities, one screen" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner },
            c: { language: "c", code: cBeginner },
          },
        },
        { kind: "heading", text: "Race the algorithms" },
        {
          kind: "prose",
          html: `<p>Drag <code>n</code> and watch the complexity classes pull apart. The bars are log-scaled so they all stay visible, but the operation counts and time estimates are real. Then flip on Bitcoin mode to see the one gap that secures the entire network.</p>`,
        },
        { kind: "widget", name: "big-o-race" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Big O in the **data structures you know**",
      blocks: [
        {
          kind: "prose",
          html: `<p>You have already built every data structure on this site. Now see the exact Big O of every operation on each one. This is the lookup table you will use for the rest of your career.</p>`,
        },
        { kind: "heading", text: "Arrays" },
        {
          kind: "table",
          headers: ["operation", "complexity", "why"],
          rows: [
            ["access by index", "<strong>O(1)</strong>", "<code>base + i × size</code> is one CPU instruction"],
            ["search (unsorted)", "O(n)", "must check every element"],
            ["search (sorted, binary)", "O(log n)", "eliminates half each step"],
            ["insert at end", "O(1) amortised", "append is one write (plus rare regrowth)"],
            ["insert at beginning", "O(n)", "must shift every element right"],
            ["delete at index", "O(n)", "must shift elements to fill the gap"],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// why arrays dominate hot paths",
          body: `O(1) access plus a cache-friendly contiguous layout. Two properties nothing else matches simultaneously. The arrays page is where that layout came from.`,
        },
        { kind: "heading", text: "Linked lists" },
        {
          kind: "table",
          headers: ["operation", "complexity", "why"],
          rows: [
            ["access by index", "O(n)", "follow the pointer chain from the head"],
            ["search", "O(n)", "traverse from the head"],
            ["insert at head", "<strong>O(1)</strong>", "just update the head pointer"],
            ["insert at tail", "O(1) / O(n)", "O(1) with a tail pointer, O(n) without"],
            ["insert at middle", "O(n)", "O(n) to find, O(1) to splice"],
            ["delete at head", "<strong>O(1)</strong>", "update the head pointer"],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the hidden truth",
          body: `Traversal is the same O(n) as an array, but 10 to 100 times slower in practice. Not because of Big O, because of cache misses. The memory page explains why. Big O measures operations; it does not measure where those operations land in the cache hierarchy.`,
        },
        { kind: "heading", text: "Hash maps" },
        {
          kind: "table",
          headers: ["operation", "complexity", "why"],
          rows: [
            ["lookup", "<strong>O(1)</strong> average", "hash the key, jump to the slot"],
            ["insert", "<strong>O(1)</strong> average", "hash the key, write the slot"],
            ["delete", "<strong>O(1)</strong> average", "hash the key, clear the slot"],
            ["worst case (all collide)", "O(n)", "degenerates to a chain walk; good hash functions prevent it"],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the O(1) miracle",
          body: `Every Python dict, every JS object, every Rust HashMap, Bitcoin's UTXO set with 85 million entries: all O(1) lookup. The hashing page explained the mechanism; Big O explains why it matters. O(1) versus O(n) at 85 million entries is the difference between a working node and an unusable one.`,
        },
        { kind: "heading", text: "Recursion" },
        {
          kind: "table",
          headers: ["algorithm", "time", "space"],
          rows: [
            ["factorial (recursive)", "O(n)", "O(n) stack frames"],
            ["fibonacci (naive)", "<strong>O(2ⁿ)</strong>", "O(n)"],
            ["fibonacci (memoised)", "O(n)", "O(n)"],
            ["binary search (recursive)", "O(log n)", "O(log n)"],
            ["merge sort", "O(n log n)", "O(n)"],
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the warning was a complexity class",
          body: `The recursion page showed why naive Fibonacci kills your program. Big O is the reason: O(2ⁿ) means 30 elements is a billion calls. The complexity class <em>was</em> the warning sign.`,
        },
        { kind: "heading", text: "One problem, three complexities" },
        {
          kind: "prose",
          html: `<p>Duplicate detection, three ways: the nested-loop O(n²), the sort-then-scan O(n log n), and the hash-set O(n). Same answer every time; the only difference is the shape, and at ten million elements that shape is the difference between instant and never.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustDup },
            c: { language: "c", code: cDup },
          },
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Amortised cost, space, and where Big O meets **security**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Worst case is not always the right measure. Sometimes an operation is occasionally expensive but cheap on average. <strong>Amortised analysis</strong> accounts for that. And <strong>space complexity</strong> is the dimension most tutorials skip. Both matter in production.</p>`,
        },
        { kind: "heading", text: "Amortised analysis: the growing array" },
        {
          kind: "prose",
          html: `<p>When a <code>Vec</code> or <code>ArrayList</code> runs out of capacity it allocates a new buffer (twice the size), copies all elements over, and frees the old one. That copy is O(n), expensive, but it happens rarely. Between copies, every append is O(1). Over n appends the total copy work is <code>1 + 2 + 4 + ... + n = 2n</code>, so total work is <code>3n = O(n)</code> and the average per append is <strong>O(1) amortised</strong>, despite the occasional O(n) spike.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAmort },
            c: { language: "c", code: cAmort },
          },
        },
        { kind: "heading", text: "Space complexity and the time-space tradeoff" },
        {
          kind: "prose",
          html: `<p>Space complexity uses the same notation. O(1) space means fixed memory regardless of input (in-place sorting with swaps). O(n) space means it grows with the input (a copy of the array, a hash set of n entries, a recursion stack n deep). O(n²) space is rare and almost always a bug.</p>
<p>The three duplicate-detection functions are the tradeoff in miniature:</p>`,
        },
        {
          kind: "table",
          headers: ["approach", "time", "space"],
          rows: [
            ["nested loops", "O(n²)", "O(1)"],
            ["sort then scan", "O(n log n)", "O(n)"],
            ["hash set", "O(n)", "O(n)"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Spending memory to buy time is one of the fundamental engineering tradeoffs. Bitcoin's UTXO set is the most expensive example in existence: roughly 8GB of RAM to achieve O(1) validation. The alternative would be to scan every past transaction for every new one, O(n) per validation across millions of validations. That is not Bitcoin; that is a database that cannot scale.</p>`,
        },
        { kind: "heading", text: "Big O in Bitcoin's security" },
        {
          kind: "prose",
          html: `<p>The single most important Big O relationship in applied computing is an asymmetry, and it is deliberate. It <em>is</em> the security model.</p>`,
        },
        {
          kind: "table",
          headers: ["operation", "complexity", "who can do it"],
          rows: [
            ["compute a SHA-256 hash", "<strong>O(1)</strong>", "everyone, in nanoseconds"],
            ["verify a hash", "<strong>O(1)</strong>", "everyone, in nanoseconds"],
            ["find a valid nonce", "O(2⁷⁰)", "only miners, with electricity"],
            ["reverse SHA-256", "O(2²⁵⁶)", "nobody, ever"],
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMine },
            c: { language: "c", code: cMine },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// proof of work is Big O weaponised",
          body: `The gap between O(1) and O(2²⁵⁶) is Bitcoin's moat. Not cryptographic magic: asymmetric computational complexity. Compute is O(1) so everyone can do it; verify is O(1) so everyone can check it; finding a nonce is O(2⁷⁰) so only miners with real electricity can; reversing the hash is O(2²⁵⁶) so nobody can. The whole system is one carefully chosen complexity gap.`,
        },
        { kind: "heading", text: "The sorting ceiling" },
        {
          kind: "prose",
          html: `<p>Big O also defines what is <em>possible</em>. Any algorithm that sorts by comparing elements cannot do better than O(n log n). This is proven, not a limitation of current cleverness: there are <code>n!</code> possible orderings of n elements, each comparison eliminates at most half of them, so the minimum number of comparisons is <code>log₂(n!) ≈ n log n</code>.</p>
<p>O(n log n) is the sorting ceiling. Merge sort hits it; quicksort hits it on average; bubble sort and insertion sort do not. The next page proves all of this in code.</p>`,
        },
        { kind: "heading", text: "Big O across ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>This page is the backbone the whole curriculum hangs from. Every prior topic has a Big O story:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x02 / binary",
              value: "Binary search is O(log n)",
              desc: "Binary search works because binary is ordered. Each comparison eliminates half the search space. Its entire efficiency comes from the structure of binary numbers.",
              href: "/binary",
            },
            {
              label: "0x0B / arrays",
              value: "O(1) access, the superpower",
              desc: "base + i × size is one instruction: O(1) access. O(n) search unsorted, O(log n) sorted, O(n) insert and delete in the middle. The contiguous layout is what makes O(1) possible.",
              href: "/arrays",
            },
            {
              label: "0x0C / linked lists",
              value: "O(n) access, the hidden cost",
              desc: "No base + offset, so you follow the chain: O(n) access, O(1) insert at head. Same O(n) traversal as arrays but 10 to 100 times slower. Big O explains the algorithm; cache explains the reality.",
              href: "/linked-list",
            },
            {
              label: "0x06 / memory",
              value: "Where Big O has limits",
              desc: "Same O(n) on an array can beat O(n) on a linked list because of cache behaviour. Big O counts operations, not memory access patterns, not cache hits, not hardware.",
              href: "/memory",
            },
            {
              label: "0x05 / cpu",
              value: "Counting the operations",
              desc: "The CPU executes one operation at a time, and Big O counts those operations. O(1) is one execution unit regardless of n; O(n) is n of them. The fetch-decode-execute loop runs once per unit of work.",
              href: "/cpu",
            },
            {
              label: "0x14 / recursion",
              value: "Elegant or a time bomb",
              desc: "Every recursive algorithm has a Big O: factorial O(n), naive Fibonacci O(2ⁿ), merge sort O(n log n), binary search O(log n). Big O is how you know which one you wrote.",
              href: "/recursion",
            },
            {
              label: "0x0D / hashing",
              value: "The O(1) that runs Bitcoin",
              desc: "Hash maps reach O(1) average by computing a direct address: no searching, no comparing. O(1) versus O(n) at 85 million entries is the difference between Bitcoin validation and an unusable system.",
              href: "/hashing",
            },
            {
              label: "0x0F / networking",
              value: "Why packets arrive fast",
              desc: "Routing is a Big O problem. Dijkstra's shortest path is O((V+E) log V). If routing were O(n²) the internet would be slower than the postal service. Big O is literally why your packets arrive in milliseconds.",
              href: "/networking",
            },
            {
              label: "0x10 / distributed systems",
              value: "Naming the cost of agreement",
              desc: "CAP is partly a Big O problem. Eventually-consistent reads are O(1); strongly-consistent reads cost O(network round-trips). The distributed-systems page showed the tradeoff; Big O names the cost.",
              href: "/distributed-systems",
            },
            {
              label: "0x13 / blockchain",
              value: "Security is asymmetric Big O",
              desc: "Compute a hash O(1), verify O(1), find a nonce O(2⁷⁰), reverse SHA-256 O(2²⁵⁶). The gap between O(1) and O(2²⁵⁶) is the entire security model. Not cryptography. Complexity.",
              href: "/blockchain",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x16",
    title: "The ceiling proven in code: sorting algorithms.",
    href: "/sorting-algorithms",
    label: "sorting algorithms",
    variant: "magenta",
  },
};
