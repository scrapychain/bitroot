import type { PageContent } from "@/types/content";

const rustBeginner = `// Linear search: works on any slice, sorted or not.
// O(n) time. The built-in equivalent is .contains()
// or .iter().position(|x| x == &target).
fn linear_search(arr: &[i32], target: i32) -> Option<usize> {
    for (i, &val) in arr.iter().enumerate() {
        if val == target {
            return Some(i);
        }
    }
    None
    // Simple. Correct. Slow for large data.
    // Returns None cleanly if not found.
    // C would return -1 (easy to forget to check).
}

// Binary search: requires sorted input.
// O(log n) time. The built-in is arr.binary_search().
fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    let mut lo = 0;
    let mut hi = arr.len();

    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        // lo + (hi - lo) / 2 avoids integer overflow.
        // lo + hi could overflow if both are large.
        // C makes this mistake constantly.

        match arr[mid].cmp(&target) {
            std::cmp::Ordering::Equal   => return Some(mid),
            std::cmp::Ordering::Less    => lo = mid + 1,
            std::cmp::Ordering::Greater => hi = mid,
        }
    }
    None
    // Rust: arr.binary_search(&target) does this.
    // Returns Ok(index) or Err(insertion_point).
    // The insertion point tells you WHERE it would be.
    // Useful for sorted inserts.
}

fn main() {
    let data = vec![1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    println!("{:?}", linear_search(&data, 11));  // Some(5)
    println!("{:?}", binary_search(&data, 11));  // Some(5)
    println!("{:?}", binary_search(&data, 4));   // None
    println!("{:?}", data.binary_search(&11));   // Ok(5)
    println!("{:?}", data.binary_search(&4));    // Err(2)
}`;

const cBeginner = `#include <stdio.h>
#include <stddef.h>

/* Linear search: works on unsorted arrays.
 * Returns index of target, or -1 if not found. */
int linear_search(const int *arr, size_t n, int target) {
    for (size_t i = 0; i < n; i++) {
        if (arr[i] == target)
            return (int)i;
    }
    return -1;
    /* -1 is the C convention for "not found".
     * Unlike Rust's Option<usize>, -1 is easy
     * to forget to check. Unchecked: silent bug. */
}

/* Binary search: requires sorted input.
 * Passing unsorted data produces wrong answers
 * with no warning and no error. C trusts you. */
int binary_search(const int *arr, size_t n, int target) {
    int lo = 0;
    int hi = (int)n - 1;

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        /* lo + (hi - lo)/2 avoids overflow. */
        /* (lo + hi)/2 overflows when lo + hi > INT_MAX. */
        /* A famous bug in Java's binary search ran for 9 years. */

        if      (arr[mid] == target) return mid;
        else if (arr[mid]  < target) lo = mid + 1;
        else                          hi = mid - 1;
    }
    return -1;
}

/* C stdlib bsearch: type-erased binary search.
 * Same as qsort's companion function. */
#include <stdlib.h>

int cmp_int(const void *a, const void *b) {
    return (*(const int*)a > *(const int*)b)
          -(*(const int*)a < *(const int*)b);
}

int main(void) {
    int data[] = {1, 3, 5, 7, 9, 11, 13, 15, 17, 19};
    size_t n = sizeof data / sizeof *data;

    int target = 11;
    int *found = bsearch(&target, data, n,
                         sizeof *data, cmp_int);
    printf("%s\\n", found ? "found" : "not found");
    /* bsearch returns NULL if not found.
     * Check the return value. Always. */
    return 0;
}`;

const rustOverflow = `fn main() {
    let lo: i32 = 1_500_000_000;
    let hi: i32 = 2_000_000_000;

    // let bad = (lo + hi) / 2;
    // In a debug build the line above PANICS:
    // "attempt to add with overflow". Rust refuses
    // to silently hand back a wrong answer.

    let good = lo + (hi - lo) / 2;   // overflow-safe
    println!("safe mid: {good}");    // 1750000000

    // lo + hi = 3,500,000,000 > i32::MAX (2,147,483,647).
    // C wraps it to a negative index. Rust panics in
    // debug, wraps in release. The fix is identical in
    // both languages: lo + (hi - lo) / 2 never overflows.
}`;

const cOverflow = `#include <stdio.h>

int main(void) {
    int lo = 1500000000;
    int hi = 2000000000;

    int bad  = (lo + hi) / 2;        /* lo + hi overflows int */
    int good = lo + (hi - lo) / 2;   /* overflow-safe */

    printf("buggy mid: %d\\n", bad);   /* negative: out of bounds */
    printf("safe  mid: %d\\n", good);  /* 1750000000, correct */

    /* lo + hi = 3,500,000,000 exceeds INT_MAX (2,147,483,647). */
    /* The sum wraps to a negative int, so mid goes negative. */
    /* This line shipped in Java's binary search in 1998 and */
    /* went unnoticed until 2006. Nine years in production. */
    return 0;
}`;

const rustIntermediate = `// Binary search on custom types.
// binary_search_by_key() and partition_point() let you
// search on one field without unpacking the whole struct.

#[derive(Debug)]
struct Transaction {
    fee_rate: u64,  // satoshis per byte
    txid:     [u8; 32],
}

fn main() {
    // A mempool. Miners want the highest-fee transactions
    // first, so we keep it sorted by fee_rate descending.
    let mut mempool = vec![
        Transaction { fee_rate: 500, txid: [1u8; 32] },
        Transaction { fee_rate: 250, txid: [2u8; 32] },
        Transaction { fee_rate: 100, txid: [3u8; 32] },
        Transaction { fee_rate:  50, txid: [4u8; 32] },
    ];
    mempool.sort_unstable_by(|a, b| b.fee_rate.cmp(&a.fee_rate));

    // partition_point is binary search. It finds the split
    // where the predicate flips from true to false: O(log n).
    let min_fee = 200u64;
    let cutoff = mempool.partition_point(|tx| tx.fee_rate >= min_fee);
    let high_fee = &mempool[..cutoff];

    println!("{} transactions at >= 200 sat/byte", high_fee.len());
    // The insertion point is the useful part. It tells you
    // WHERE the boundary is, not just whether a value exists.
    // C's bsearch cannot give you this.
}`;

const cIntermediate = `#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>

typedef struct {
    uint64_t fee_rate;   /* satoshis per byte */
    uint8_t  txid[32];
} Transaction;

/* qsort comparison: fee_rate descending. */
static int cmp_fee_desc(const void *a, const void *b) {
    const Transaction *ta = a;
    const Transaction *tb = b;
    if (tb->fee_rate > ta->fee_rate) return  1;
    if (tb->fee_rate < ta->fee_rate) return -1;
    return 0;
}

/* bsearch comparison: match an exact fee_rate. */
static int cmp_fee_exact(const void *key, const void *elem) {
    uint64_t target = *(const uint64_t *)key;
    const Transaction *tx = elem;
    if (target > tx->fee_rate) return  1;
    if (target < tx->fee_rate) return -1;
    return 0;
}

int main(void) {
    Transaction mempool[] = {
        { 500, {1} }, { 250, {2} }, { 100, {3} }, { 50, {4} },
    };
    size_t n = sizeof mempool / sizeof *mempool;

    qsort(mempool, n, sizeof *mempool, cmp_fee_desc);

    uint64_t target = 250;
    Transaction *found = bsearch(
        &target, mempool, n, sizeof *mempool, cmp_fee_exact);

    if (found)
        printf("found fee_rate=%llu\\n",
               (unsigned long long)found->fee_rate);
    else
        puts("not found");

    /* bsearch returns NULL on a miss and nothing else. */
    /* No insertion point. Rust's Err(idx) is more useful. */
    return 0;
}`;

const rustAdvanced = `// Exponential search: find the range first, then binary search.
// Useful when the array is huge, or its end is expensive to reach.
fn exponential_search(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() { return None; }
    if arr[0] == target { return Some(0); }

    // Double the bound until arr[bound] >= target or we run off the end.
    let mut bound = 1usize;
    while bound < arr.len() && arr[bound] < target {
        bound *= 2;
    }

    // Binary search the bracketed window [bound/2, bound].
    let lo = bound / 2;
    let hi = bound.min(arr.len() - 1) + 1;
    arr[lo..hi].binary_search(&target).map(|i| lo + i).ok()
    // O(log i) where i is the target's index.
    // Faster than plain binary search when the target is near the front.
}

// partition_point is Rust's lower_bound / upper_bound.
fn equal_range(arr: &[i32], target: i32) -> std::ops::Range<usize> {
    let lo = arr.partition_point(|&x| x <  target);
    let hi = arr.partition_point(|&x| x <= target);
    lo..hi
    // Every index where arr[i] == target, in O(log n).
    // Empty range if the target is absent. This is C++'s equal_range.
}

fn main() {
    let data = vec![1, 2, 3, 3, 3, 5, 7, 9];
    println!("{:?}", equal_range(&data, 3));         // 2..5
    println!("{:?}", equal_range(&data, 4));         // 5..5 (empty)
    println!("{:?}", exponential_search(&data, 7));  // Some(6)
}`;

const cAdvanced = `#include <stddef.h>

/* Plain binary search returning a pointer, or NULL. */
static int *bsearch_int(int target, const int *arr, size_t n) {
    int lo = 0, hi = (int)n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if      (arr[mid] == target) return (int *)&arr[mid];
        else if (arr[mid]  < target) lo = mid + 1;
        else                          hi = mid - 1;
    }
    return NULL;
}

/* Exponential search: bracket the range, then binary search it. */
int *exponential_search(const int *arr, size_t n, int target) {
    if (n == 0)           return NULL;
    if (arr[0] == target) return (int *)arr;

    size_t bound = 1;
    while (bound < n && arr[bound] < target)
        bound *= 2;

    size_t lo = bound / 2;
    size_t hi = bound < n ? bound : n - 1;
    return bsearch_int(target, arr + lo, hi - lo + 1);
}

/* Lower bound: first index where arr[i] >= target. */
size_t lower_bound(const int *arr, size_t n, int target) {
    size_t lo = 0, hi = n;
    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (arr[mid] < target) lo = mid + 1;
        else                    hi = mid;
    }
    return lo;
}

/* Upper bound: first index where arr[i] > target. */
size_t upper_bound(const int *arr, size_t n, int target) {
    size_t lo = 0, hi = n;
    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (arr[mid] <= target) lo = mid + 1;
        else                     hi = mid;
    }
    return lo;
}
/* [lower_bound, upper_bound) brackets every occurrence of target. */
/* That half-open range is exactly C++'s equal_range.              */`;

const rustBitcoin = `use std::collections::HashMap;

// The real Bitcoin Core split: a hash map for point lookups,
// a sorted structure for range scans. Simplified with a Vec here;
// Core uses LevelDB, which keeps keys sorted on disk.
struct UtxoSet {
    // O(1) point lookup: does this exact coin exist?
    by_outpoint: HashMap<([u8; 32], u32), u64>,

    // O(log n) range scan, sorted by scriptpubkey.
    // (scriptpubkey, txid, vout, satoshis)
    by_script: Vec<([u8; 25], [u8; 32], u32, u64)>,
}

impl UtxoSet {
    // O(1): spend-time check. Is this coin still unspent?
    fn contains(&self, txid: &[u8; 32], vout: u32) -> bool {
        self.by_outpoint.contains_key(&(*txid, vout))
    }

    // O(log n + k): which coins does this address own?
    fn utxos_for_script(
        &self,
        script: &[u8; 25],
    ) -> &[([u8; 25], [u8; 32], u32, u64)] {
        let lo = self.by_script.partition_point(|(s, ..)| s <  script);
        let hi = self.by_script.partition_point(|(s, ..)| s <= script);
        &self.by_script[lo..hi]
        // partition_point is binary search: O(log n) to find lo and hi,
        // then O(k) to hand back the slice. A hash map cannot do this.
    }
}`;

const cBitcoin = `#include <stdint.h>
#include <stddef.h>
#include <string.h>

/* A UTXO entry, sorted by scriptpubkey so a node can find
 * every coin owned by an address with one binary search. */
typedef struct {
    uint8_t  scriptpubkey[25];
    uint8_t  txid[32];
    uint32_t vout;
    uint64_t amount_satoshis;
} Utxo;

/* Find the FIRST utxo with this scriptpubkey. O(log n).
 * Keep the result low: on a match, search left for an
 * earlier one. The caller then scans forward for the rest. */
const Utxo *find_first_utxo(const Utxo *utxos,
                            size_t n,
                            const uint8_t script[25]) {
    int lo = 0, hi = (int)n - 1, result = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int c = memcmp(utxos[mid].scriptpubkey, script, 25);
        if      (c == 0) { result = mid; hi = mid - 1; }
        else if (c <  0) lo = mid + 1;
        else             hi = mid - 1;
    }
    return result >= 0 ? &utxos[result] : NULL;
}
/* O(log n) to find the first match, then a linear scan
 * forward over the k coins that share the scriptpubkey.
 * O(log n + k), the same shape as Rust's partition_point. */`;

export const searching: PageContent = {
  slug: "searching",
  hexLabel: "0x18",
  category: "search",
  hero: {
    eyebrow: "root.system / 0x18 / search",
    title: `Find it fast.<br><span class="highlight">Or wait forever.</span>`,
    lede: `Two programs. Both correct. Both searching one billion elements. One finishes in <strong>30</strong> comparisons. One finishes in <strong>one billion</strong>. The difference is not the hardware. It is the shape of the algorithm.`,
    narrativeHtml: `<p>Your computer searches for things billions of times a day.</p>
<p>Every database query. Every autocomplete suggestion. Every Bitcoin node checking whether a transaction already exists in the mempool.</p>
<p>And there are fundamentally only two approaches.</p>
<p>Check every element until you find it.</p>
<p>Or use the structure of the data to eliminate possibilities fast.</p>
<p>The first approach works on anything. The second approach requires preparation. The preparation is sorting. And once you have it, the second approach is not twice as fast.</p>
<p>It is 33 million times faster on one billion elements.</p>
<p>You already know sorting from page twenty two. You already know Big O from page twenty one. This page is why both of those pages existed.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The **two approaches**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Before any algorithm, one question. <strong>Is your data sorted?</strong> The answer changes everything. Unsorted data forces you to check every element. Sorted data lets you eliminate half the remaining possibilities on every single comparison. That difference is the entire field of search.</p>`,
        },
        { kind: "heading", text: "Linear search: check everything" },
        {
          kind: "raw",
          html: `<div class="srch-walk">
  <div class="srch-walk-head">target <span class="srch-walk-target">847293</span></div>
  <div class="srch-walk-row">
    <span class="srch-cell is-checked">34</span>
    <span class="srch-cell is-checked">891</span>
    <span class="srch-cell is-checked">127</span>
    <span class="srch-cell is-found">847293</span>
    <span class="srch-cell">562</span>
    <span class="srch-cell srch-cell-rest">…</span>
  </div>
  <div class="srch-walk-labels">
    <span>check</span><span>check</span><span>check</span><span class="srch-hit">found</span>
  </div>
</div>`,
        },
        {
          kind: "prose",
          html: `<p>Worst case: the target is the last element, or absent entirely. Every element gets visited. That is <strong>O(n)</strong> time and <strong>O(1)</strong> space, and it works on <em>any</em> data, sorted or not.</p>
<p>Linear search has one genuine advantage. If you search only once or twice and the array is small, it is actually fine. The overhead of sorting first would cost more than the naive scan saves. Know your access pattern before reaching for something smarter.</p>`,
        },
        { kind: "heading", text: "Binary search: eliminate half, every time" },
        {
          kind: "raw",
          html: `<div class="srch-rounds">
  <div class="srch-rounds-head">target <span>847,293</span> in 1,000,000 sorted elements</div>
  <div class="srch-round">
    <span class="srch-round-n">round 1</span>
    <span class="srch-round-body">check position 500,000 = <b>634,210</b>. 847,293 &gt; 634,210, so discard the left half. <span class="srch-cut">500,000 gone</span></span>
  </div>
  <div class="srch-round">
    <span class="srch-round-n">round 2</span>
    <span class="srch-round-body">check position 750,000 = <b>821,003</b>. 847,293 &gt; 821,003, discard the left half. <span class="srch-cut">250,000 gone</span></span>
  </div>
  <div class="srch-round">
    <span class="srch-round-n">round 3</span>
    <span class="srch-round-body">check position 875,000 = <b>901,445</b>. 847,293 &lt; 901,445, discard the right half. <span class="srch-cut">125,000 gone</span></span>
  </div>
  <div class="srch-round srch-round-ellipsis"><span class="srch-round-n">…</span><span class="srch-round-body">seventeen more rounds, each halving what remains</span></div>
  <div class="srch-round is-done"><span class="srch-round-n">round 20</span><span class="srch-round-body"><b class="srch-found">FOUND.</b> twenty comparisons total.</span></div>
</div>`,
        },
        {
          kind: "prose",
          html: `<p>Twenty comparisons for a million elements. Thirty for a billion. One more comparison per doubling of the data. That is what <strong>O(log n)</strong> looks like when you watch it work.</p>`,
        },
        {
          kind: "table",
          headers: ["n", "linear (worst)", "binary (worst)"],
          rows: [
            ["1,000", "1,000", "10"],
            ["1,000,000", "1,000,000", "20"],
            ["1,000,000,000", "1,000,000,000", "30"],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the gap at scale",
          body: `At one billion elements, binary search makes about <strong>33,333,333 times fewer</strong> comparisons than linear search. Same answer. Same hardware. The only difference is whether you prepared the data first.`,
        },
        { kind: "heading", text: "Build both, in Rust and C" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner },
            c: { language: "c", code: cBeginner },
          },
        },
        { kind: "heading", text: "Watch them search" },
        { kind: "widget", name: "search-race" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "When binary search **breaks**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Binary search is fast, but it is fragile. It demands three things, and quietly breaking any one of them breaks the search.</p>
<ol>
  <li><strong>Sorted data.</strong> Pass unsorted input and C returns wrong answers with no warning. Rust's <code>slice::binary_search</code> does too. Sorting is your contract, not the algorithm's.</li>
  <li><strong>Random access.</strong> Binary search needs <code>arr[mid]</code> in O(1). Arrays give it. Linked lists do not. On a linked list binary search degrades to O(n log n), worse than linear.</li>
  <li><strong>Comparable elements.</strong> The elements need a total order. Integers are easy. Structs need a comparison you define. Truly unordered data cannot be binary searched at all.</li>
</ol>`,
        },
        { kind: "heading", text: "The overflow bug" },
        {
          kind: "prose",
          html: `<p>The most famous bug in the history of binary search is one line. <code>int mid = (lo + hi) / 2</code> overflows the instant <code>lo + hi</code> passes <code>INT_MAX</code>. It shipped in Java's standard library in 1998 and went unnoticed until 2006, because nobody had searched an array large enough to trigger it. Nine years. The fix is <code>lo + (hi - lo) / 2</code>: mathematically identical, and it never adds two large numbers together.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustOverflow },
            c: { language: "c", code: cOverflow },
          },
        },
        { kind: "heading", text: "Searching linked lists" },
        {
          kind: "prose",
          html: `<p>Finding the middle of a linked list is O(n): you have to walk to it from the head. Binary search visits O(log n) midpoints, and paying O(n) for each one gives O(n log n) total, worse than the plain O(n) linear scan. This is why the arrays page was the prerequisite. Not because arrays are the only data structure, but because binary search only makes sense on one.</p>`,
        },
        { kind: "heading", text: "Interpolation search" },
        {
          kind: "prose",
          html: `<p>Binary search always checks the middle. Interpolation search instead estimates where the target probably is from its value, the way you open a phone book near the back to find a name starting with W. On uniformly distributed data that lands in <strong>O(log log n)</strong>: about five comparisons for a billion elements, against binary search's thirty. The catch is that skewed data drags it back to O(n). Database indexes and some file formats use it. Binary search is the safe default. Interpolation is the fast one when you know your distribution.</p>`,
        },
        { kind: "heading", text: "Searching custom types, in Rust and C" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustIntermediate },
            c: { language: "c", code: cIntermediate },
          },
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Search in the **real world**",
      blocks: [
        { kind: "heading", text: "Exponential search" },
        {
          kind: "prose",
          html: `<p>Binary search assumes you know where the array ends. What if it is unbounded, or so large that reading past the end is expensive? Exponential search finds the range first. Start at index 1, double until <code>arr[i]</code> is at least the target, then binary search the window you just bracketed. It is used on unbounded arrays, streaming data, and external storage where overshooting costs a disk read.</p>`,
        },
        { kind: "heading", text: "Ternary search" },
        {
          kind: "prose",
          html: `<p>Split into thirds instead of halves. Ternary search is not for arrays. It is for finding the peak of a unimodal function, a curve that rises then falls. It is the discrete cousin of golden section search in optimisation. Different problem, same instinct: use structure to throw away possibilities.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdvanced },
            c: { language: "c", code: cAdvanced },
          },
        },
        { kind: "heading", text: "Searching in Bitcoin" },
        {
          kind: "prose",
          html: `<p>A Bitcoin node searches constantly, and it reaches for a different tool depending on the question.</p>
<p><strong>Is this transaction new?</strong> When a node receives a broadcast transaction it must check whether it already holds it. The mempool is a hash map, so this is an O(1) lookup by transaction ID. Not binary search. Not linear search. Hash search. A mempool of 100,000 transactions taking ten new ones a second cannot afford O(n), or even O(log n). It needs O(1).</p>
<p><strong>What coins does this address own?</strong> A hash map cannot answer that, because it has no order to range over. Bitcoin Core keeps the UTXO set in LevelDB, a sorted key-value store. Keys are sorted, so a range query is a binary search to find the start (O(log n)) and a scan to read the k results (O(k)).</p>
<p>This is the hashing-versus-sorting tradeoff in production. Point lookup: hash map, O(1). Range query: sorted store, O(log n + k). Bitcoin uses both, because neither one alone is enough.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitcoin },
            c: { language: "c", code: cBitcoin },
          },
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "number-systems",
        text: `Binary search returns an index, and an index is just a number, decimal for you and binary for the CPU. The number systems page is the foundation under every index, address, and array position.`,
      },
      {
        slug: "binary",
        text: `Binary search halves the search space, and every comparison is a binary operation: <code>arr[mid] &lt; target</code> is one subtraction whose sign bit picks the half to keep. Binary arithmetic doing binary search.`,
      },
      {
        slug: "cpu",
        text: `Binary search is famously cache-friendly. Thirty levels of depth over a billion elements still touch only a handful of cache lines. The CPU page explained the hierarchy this algorithm was built for.`,
      },
      {
        slug: "memory",
        text: `Each step reads <code>arr[mid]</code>, and the early mids are far apart, so the first comparisons are likely cache misses and the last few are not. The memory page is why the start is slow and the end is fast.`,
      },
      {
        slug: "arrays",
        text: `Binary search only works on arrays, because it needs <code>arr[mid]</code> in O(1). The arrays page is not a suggestion here. It is a hard requirement.`,
      },
      {
        slug: "linked-list",
        text: `You cannot binary search a linked list: finding the middle costs O(n), so the whole search degrades to O(n log n), worse than the linear scan you started with. Data structure choice decides which algorithms exist.`,
      },
      {
        slug: "pointers",
        text: `C <code>bsearch</code> hands back a <code>void*</code>; Rust <code>binary_search</code> hands back an index. The pointers page is the difference: a pointer is direct, an index needs its array to mean anything.`,
      },
      {
        slug: "compile-vs-runtime",
        text: `Whether the data is sorted is a contract the caller must keep. Pass unsorted data and both C and Rust give wrong answers at runtime, with no warning. The compile-vs-runtime page is where that invariant lives or dies.`,
      },
      {
        slug: "sorting",
        text: `Binary search is the payoff of sorting. Sort once at O(n log n), then search forever at O(log n). For read-heavy data that trade is always worth it. The sorting page is the setup; this page is the reason.`,
      },
      {
        slug: "hashing",
        text: `A hash map looks up in O(1), beating binary search, but it cannot answer range queries: find everything between 100 and 200 and the hash map is helpless. The hashing page is the O(1) trick; this page is where it runs out.`,
      },
      {
        slug: "big-o",
        text: `O(n) versus O(log n) is the most important gap in computing, and search is where you feel it directly: 33 million times fewer comparisons at a billion elements. The Big O page named it; this page makes it physical.`,
      },
      {
        slug: "recursion",
        text: `Binary search can recurse, one call per halving, but each call costs a stack frame. The recursion page is why the iterative version (O(1) space) beats the recursive one (O(log n) space) unless clarity demands otherwise.`,
      },
      {
        slug: "distributed-systems",
        text: `Distributed search is a different problem: route with consistent hashing, then search within a node, or fan a query across shards in parallel. The distributed-systems page is why single-machine algorithms do not translate directly.`,
      },
      {
        slug: "blockchain",
        text: `Bitcoin nodes search constantly: the mempool is a hash map for O(1) point lookups, the UTXO store is sorted for O(log n + k) range scans. The blockchain page is where searching stops being theory and starts guarding money.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x19",
    title: "Data that branches: how trees power filesystems, databases, and Bitcoin Merkle proofs.",
    href: "/trees",
    label: "trees",
    variant: "cyan",
  },
};
