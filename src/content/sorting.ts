import type { PageContent } from "@/types/content";

const rustBubble = `fn bubble_sort(arr: &mut [i32]) {
    let n = arr.len();
    for i in 0..n {
        let mut swapped = false;
        // each pass guarantees the largest remaining element
        // reaches its final position, so inner loop shrinks
        for j in 0..n.saturating_sub(i + 1) {
            if arr[j] > arr[j + 1] {
                arr.swap(j, j + 1);
                // swap() is bounds-checked in debug mode.
                // panics instead of silently corrupting memory.
                // C would let this go out of bounds quietly.
                swapped = true;
            }
        }
        // early exit: no swap means the array is already sorted.
        // best case O(n) on already-sorted input.
        if !swapped { break; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_bubble() {
        let mut v = vec![5, 3, 8, 1, 4];
        bubble_sort(&mut v);
        assert_eq!(v, vec![1, 3, 4, 5, 8]);
    }
}`;

const cBubble = `#include <stddef.h>

void bubble_sort(int *arr, size_t n) {
    if (!arr || n < 2) return;

    for (size_t i = 0; i < n - 1; i++) {
        int swapped = 0;

        /* each pass places the largest remaining element
         * at its final position, so we shrink the window */
        for (size_t j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                /* classic three-variable swap */
                int tmp    = arr[j];
                arr[j]     = arr[j + 1];
                arr[j + 1] = tmp;
                swapped    = 1;
            }
        }
        /* early exit: sorted if no swap occurred */
        if (!swapped) break;
    }
    /* C trusts you to pass a valid pointer and size n.
     * Out-of-bounds access is silent memory corruption.
     * Rust's swap() panics in debug builds instead. */
}`;

const rustMerge = `fn merge_sort(arr: &mut [i32]) {
    let n = arr.len();
    if n <= 1 { return; } // base case: one element is sorted

    let mid = n / 2;

    // split: copy each half into owned Vecs
    let mut left  = arr[..mid].to_vec();
    let mut right = arr[mid..].to_vec();

    // recurse: sort each half independently.
    // call stack grows log n levels deep.
    // at n = 1_000_000 that is about 20 frames.
    merge_sort(&mut left);
    merge_sort(&mut right);

    // merge: walk both sorted halves and stitch together
    let (mut i, mut j, mut k) = (0, 0, 0);
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] {
            arr[k] = left[i];  i += 1;
        } else {
            arr[k] = right[j]; j += 1;
        }
        k += 1;
    }
    // drain whichever half still has elements
    while i < left.len()  { arr[k] = left[i];  i += 1; k += 1; }
    while j < right.len() { arr[k] = right[j]; j += 1; k += 1; }
    // The borrow checker ensures no two mutable references
    // to arr exist at once. Safe to split and recombine.
}`;

const cMerge = `#include <stdlib.h>
#include <string.h>
#include <stddef.h>

static void merge(int *arr, size_t l,
                  size_t m, size_t r) {
    size_t n1 = m - l, n2 = r - m;

    /* temporary arrays for each half */
    int *left  = malloc(n1 * sizeof *left);
    int *right = malloc(n2 * sizeof *right);
    if (!left || !right) { free(left); free(right); return; }

    memcpy(left,  arr + l, n1 * sizeof *left);
    memcpy(right, arr + m, n2 * sizeof *right);

    size_t i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else                     arr[k++] = right[j++];
    }
    while (i < n1) arr[k++] = left[i++];
    while (j < n2) arr[k++] = right[j++];

    free(left);
    free(right);
    /* C requires explicit malloc/free every call.
     * Forget free() and you leak on every merge.
     * Rust drops the Vec automatically at end of scope. */
}

void merge_sort(int *arr, size_t l, size_t r) {
    if (r - l <= 1) return;          /* base case */
    size_t m = l + (r - l) / 2;
    merge_sort(arr, l, m);           /* sort left */
    merge_sort(arr, m, r);           /* sort right */
    merge(arr, l, m, r);             /* merge both */
}
/* call as: merge_sort(arr, 0, n); */`;

const rustQuick = `fn quicksort(arr: &mut [i32]) {
    if arr.len() <= 1 { return; }

    // partition places the pivot in its final position
    let pivot_idx = partition(arr);

    // split_at_mut gives two non-overlapping mutable slices.
    // the borrow checker verifies they don't overlap.
    let (left, right) = arr.split_at_mut(pivot_idx);
    quicksort(left);
    quicksort(&mut right[1..]); // skip the pivot itself
}

fn partition(arr: &mut [i32]) -> usize {
    let pivot = *arr.last().unwrap(); // last element as pivot
    let mut i = 0;

    for j in 0..arr.len() - 1 {
        if arr[j] <= pivot {
            arr.swap(i, j);
            i += 1;
        }
    }
    // move pivot to its final sorted position
    let last = arr.len() - 1;
    arr.swap(i, last);
    i
}

// Note: the standard library does NOT use this.
// .sort()           -- stable Timsort, O(n log n) guaranteed
// .sort_unstable()  -- pdqsort, faster, O(n log n) guaranteed
// Always prefer std over a hand-rolled sort.`;

const cQuick = `#include <stddef.h>

static void swap_ints(int *a, int *b) {
    int t = *a; *a = *b; *b = t;
}

static size_t partition(int *arr,
                        size_t lo, size_t hi) {
    int    pivot = arr[hi]; /* last element as pivot */
    size_t i     = lo;

    for (size_t j = lo; j < hi; j++) {
        if (arr[j] <= pivot) {
            swap_ints(&arr[i], &arr[j]);
            i++;
        }
    }
    swap_ints(&arr[i], &arr[hi]); /* pivot to final spot */
    return i;
}

void quicksort(int *arr, size_t lo, size_t hi) {
    if (lo >= hi) return;
    size_t p = partition(arr, lo, hi);
    if (p > 0) quicksort(arr, lo, p - 1);
    quicksort(arr, p + 1, hi);
}
/* call as: quicksort(arr, 0, n - 1);
 *
 * C stdlib equivalent:
 *   qsort(arr, n, sizeof(int), cmp_int);
 * Takes void* — no type safety at all.
 * Rust generics replace void* with compile-time checks. */`;

const rustStdlib = `// Use the standard library. Always.
// It is faster than anything you would write.

fn stdlib_sorting_examples() {
    let mut nums = vec![5, 3, 8, 1, 4, 2, 7, 6];

    // Stable sort (Timsort) -- equal elements keep original order
    nums.sort();
    // [1, 2, 3, 4, 5, 6, 7, 8]

    // Unstable sort (pdqsort) -- faster, same O(n log n) guarantee
    nums.sort_unstable();
    // same result here, but equal elements may reorder

    // Custom comparator
    let mut words = vec!["banana", "apple", "cherry", "date"];
    words.sort_by(|a, b| a.len().cmp(&b.len()));
    // ["date", "apple", "banana", "cherry"]

    // Sorting Bitcoin mempool transactions by fee rate (descending)
    #[derive(Debug)]
    struct MempoolEntry { fee_rate: u64, size_vbytes: u32 }

    let mut mempool = vec![
        MempoolEntry { fee_rate: 100, size_vbytes: 250 },
        MempoolEntry { fee_rate: 500, size_vbytes: 141 },
        MempoolEntry { fee_rate: 250, size_vbytes: 300 },
    ];
    // highest fee rate mines first -- pdqsort, O(n log n) worst case
    mempool.sort_unstable_by(|a, b| b.fee_rate.cmp(&a.fee_rate));
    // [{500, 141}, {250, 300}, {100, 250}]

    // sort_by_key for cleaner field extraction
    mempool.sort_unstable_by_key(|tx| std::cmp::Reverse(tx.fee_rate));
}`;

const cStdlib = `#include <stdlib.h>
#include <stdint.h>
#include <string.h>

/* qsort() comparison functions.
 * void* args are untyped -- no compile-time safety. */

int cmp_int_asc(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    /* never use return x - y: integer overflow is undefined */
    return (x > y) - (x < y);
}

int cmp_int_desc(const void *a, const void *b) {
    return cmp_int_asc(b, a);
}

/* Bitcoin mempool: sort by fee rate descending */
typedef struct {
    uint64_t fee_rate;    /* satoshis per virtual byte */
    uint32_t size_vbytes;
    uint8_t  txid[32];
} MempoolEntry;

static int cmp_fee_desc(const void *a, const void *b) {
    const MempoolEntry *ea = a;
    const MempoolEntry *eb = b;
    if (eb->fee_rate > ea->fee_rate) return  1;
    if (eb->fee_rate < ea->fee_rate) return -1;
    return 0;
}

void sort_mempool(MempoolEntry *pool, size_t n) {
    /* O(n log n) average, O(n^2) worst case in some impls */
    qsort(pool, n, sizeof *pool, cmp_fee_desc);
}

int main(void) {
    int nums[] = {5, 3, 8, 1, 4};
    qsort(nums, 5, sizeof *nums, cmp_int_asc);
    /* [1, 3, 4, 5, 8] */

    MempoolEntry pool[] = {
        {100, 250, {0}},
        {500, 141, {0}},
        {250, 300, {0}},
    };
    sort_mempool(pool, 3);
    /* [{500,...}, {250,...}, {100,...}] -- highest fee first */
    return 0;
}`;

const rustMempool = `use std::cmp::Reverse;

#[derive(Debug, Eq, PartialEq)]
struct MempoolEntry {
    fee_rate:    u64,      // satoshis per virtual byte
    size_vbytes: u32,      // transaction weight
    txid:        [u8; 32], // transaction identifier
}

impl Ord for MempoolEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // descending fee rate: highest mines first
        other.fee_rate.cmp(&self.fee_rate)
    }
}

impl PartialOrd for MempoolEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

fn build_block<'a>(
    mempool: &'a mut Vec<MempoolEntry>,
    block_limit_vbytes: u32,
) -> Vec<&'a MempoolEntry> {
    // O(n log n) -- pdqsort via sort_unstable()
    mempool.sort_unstable();

    let mut block = Vec::new();
    let mut used  = 0u32;

    for entry in mempool.iter() {
        if used + entry.size_vbytes > block_limit_vbytes { break; }
        block.push(entry);
        used += entry.size_vbytes;
    }
    block
    // This is the algorithm that decides
    // whose Bitcoin transaction confirms next
    // and whose waits another ten minutes.
    // A sort on an array.
    // The most consequential sort in finance.
}`;

const cMempool = `#include <stdint.h>
#include <stdlib.h>
#include <stddef.h>

typedef struct {
    uint64_t fee_rate;     /* sat / vbyte */
    uint32_t size_vbytes;
    uint8_t  txid[32];
} MempoolEntry;

/* highest fee rate first */
static int cmp_fee_rate(const void *a, const void *b) {
    const MempoolEntry *ea = a;
    const MempoolEntry *eb = b;
    if (eb->fee_rate > ea->fee_rate) return  1;
    if (eb->fee_rate < ea->fee_rate) return -1;
    return 0;
}

/* returns number of selected transactions */
size_t build_block(MempoolEntry *pool, size_t n,
                   uint32_t block_limit,
                   size_t   *selected_idx) {
    /* O(n log n) sort by fee rate descending */
    qsort(pool, n, sizeof *pool, cmp_fee_rate);

    uint32_t used  = 0;
    size_t   count = 0;

    for (size_t i = 0; i < n; i++) {
        if (used + pool[i].size_vbytes > block_limit) break;
        selected_idx[count++] = i;
        used += pool[i].size_vbytes;
    }
    return count;
}
/* Sorting decides financial priority.
 * The algorithm is O(n log n).
 * The stakes are measured in satoshis. */`;

export const sorting: PageContent = {
  slug: "sorting",
  hexLabel: "0x16",
  category: "algorithms",
  hero: {
    eyebrow: "root.system / 0x16 / sorting",
    title: `Before you can find anything<br><span class="highlight">you have to sort everything.</span>`,
    lede: `Every search result. Every database query. Every contact list. Every Bitcoin transaction waiting to be confirmed. None of it works without sorting. This page is the algorithm that taught everyone to sort, the algorithm that does it properly, the algorithm the real world uses, and why the gap between them is the entire field of algorithm design.`,
    narrativeHtml: `<p>Sorting is not about alphabetical order.</p>
<p>Sorting is about answering one question.<br>Over and over.<br>Faster and faster.</p>
<p>Is this thing bigger than that thing?</p>
<p>That is it.</p>
<p>Every sorting algorithm ever written.<br>In every language.<br>On every computer.<br>In every data centre on Earth.</p>
<p>Boils down to that one comparison.</p>
<p>And the entire science of sorting is about how many times you have to ask it.</p>
<p>The Big O page proved O(n log n) is the mathematical ceiling.<br>No comparison-based sort can do better.<br>This page builds to that ceiling.<br>One algorithm at a time.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Why **sorting** exists",
      blocks: [
        { kind: "heading", text: "Sort once. Search forever." },
        {
          kind: "prose",
          html: `<p>Before the first algorithm, the argument for sorting in one concrete comparison:</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "unsorted data",
              value: "O(n) search",
              desc: "Find a value in 1,000,000 elements. Must check every element. Worst case: 1,000,000 comparisons. No structure to exploit.",
            },
            {
              label: "sorted data",
              value: "O(log n) search",
              desc: "Find a value in 1,000,000 sorted elements. Binary search: eliminate half each step. Worst case: 20 comparisons. 50,000x faster to find.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// sort once. search forever.",
          body: `You pay the sort cost once. You collect the search dividend every time anyone queries your data. A database that sorts on insert answers every future query in O(log n). One that stores unsorted pays O(n) forever.`,
        },
        { kind: "heading", text: "Bubble sort: the prototype" },
        {
          kind: "prose",
          html: `<p>Bubble sort is the algorithm nobody uses and everybody learns. Not because it is useful. Because it is the prototype. Every faster algorithm is bubble sort with a smarter idea about which elements to compare and in what order. Understand bubble sort and you understand every sort that followed it.</p>
<p>The idea: walk the array repeatedly, swapping any pair that is out of order. Larger elements "bubble" to the end. After each full pass, one more element is guaranteed to be in its final position. Repeat until no swaps happen.</p>`,
        },
        {
          kind: "raw",
          html: `<div style="background:var(--bg-2);border-radius:0.5rem;padding:1rem 1.25rem;font-family:var(--font-mono);font-size:0.78rem;line-height:2;overflow-x:auto;">
<div style="color:var(--fg-mute);margin-bottom:0.5rem;font-size:0.65rem;letter-spacing:0.08em;">// bubble sort walkthrough — array: [5, 3, 8, 1, 4]</div>
<div><span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">5</span> <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">3</span> &nbsp;8&nbsp; &nbsp;1&nbsp; &nbsp;4&nbsp; &nbsp;<span style="color:#f59e0b;">5&gt;3 swap</span></div>
<div>&nbsp;3&nbsp; <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">5</span> <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">8</span> &nbsp;1&nbsp; &nbsp;4&nbsp; &nbsp;<span style="color:var(--fg-mute);">5&lt;8 no swap</span></div>
<div>&nbsp;3&nbsp; &nbsp;5&nbsp; <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">8</span> <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">1</span> &nbsp;4&nbsp; &nbsp;<span style="color:#f59e0b;">8&gt;1 swap</span></div>
<div>&nbsp;3&nbsp; &nbsp;5&nbsp; &nbsp;1&nbsp; <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">8</span> <span style="background:#00d4ff22;color:#00d4ff;padding:0.1rem 0.3rem;border-radius:3px;">4</span> &nbsp;<span style="color:#f59e0b;">8&gt;4 swap</span></div>
<div>&nbsp;3&nbsp; &nbsp;5&nbsp; &nbsp;1&nbsp; &nbsp;4&nbsp; <span style="color:#10b981;padding:0.1rem 0.3rem;">8 settled</span> &nbsp;<span style="color:#10b981;">pass 1 done</span></div>
<div style="margin-top:0.5rem;color:var(--fg-mute);font-size:0.65rem;">...passes 2-4 continue until: &nbsp;<span style="color:#10b981;">1 &nbsp;3 &nbsp;4 &nbsp;5 &nbsp;8</span></div>
</div>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            { label: "best case", value: "O(n)", desc: "Already sorted. One pass detects no swaps. Early exit." },
            { label: "average", value: "O(n²)", desc: "Random data. Every pair touched many times." },
            { label: "worst case", value: "O(n²)", desc: "Reverse sorted. Maximum comparisons and swaps." },
            { label: "space", value: "O(1)", desc: "Sorts in place. No extra memory allocated." },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBubble },
            c: { language: "c", code: cBubble },
          },
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The early-exit optimisation turns O(n²) into O(n) on already-sorted data. This is the same pattern the Big O page described: best case, average case, and worst case are all different measurements of the same algorithm. The array page showed why contiguous memory makes these sequential comparisons cheap. <a href="/big-o">← see: Big O</a> &nbsp; <a href="/arrays">← see: Arrays</a></p>`,
        },
        { kind: "widget", name: "sorting-race" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Merge sort — the **recursion** payoff",
      blocks: [
        {
          kind: "prose",
          html: `<p>The Big O page proved O(n log n) is the ceiling. The recursion page showed divide and conquer. Merge sort is where both ideas become code. It is the most important sorting algorithm you will ever learn. Not because it is the fastest. Because it teaches you that splitting a problem in half is always worth considering.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the insight",
          body: `A sorted array of one element is always sorted. This is not a trick. This is the base case. And it is the foundation that merge sort is built on entirely. Split until every piece is trivially sorted. Then merge.`,
        },
        { kind: "heading", text: "The recursion tree" },
        {
          kind: "raw",
          html: `<div style="background:var(--bg-2);border-radius:0.5rem;padding:1.25rem;font-family:var(--font-mono);font-size:0.75rem;line-height:1.9;overflow-x:auto;">
<div style="color:var(--fg-mute);margin-bottom:0.75rem;font-size:0.65rem;letter-spacing:0.08em;">// merge sort — divide and conquer on [5 3 8 1 4 2 7 6]</div>
<div style="color:var(--fg);">[5 &nbsp;3 &nbsp;8 &nbsp;1 &nbsp;4 &nbsp;2 &nbsp;7 &nbsp;6]</div>
<div style="color:var(--fg-mute);margin-left:1rem;">split</div>
<div style="color:var(--fg);margin-left:1rem;">[5 &nbsp;3 &nbsp;8 &nbsp;1] &nbsp;&nbsp;[4 &nbsp;2 &nbsp;7 &nbsp;6]</div>
<div style="color:var(--fg-mute);margin-left:2rem;">split &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;split</div>
<div style="color:var(--fg);margin-left:2rem;">[5 &nbsp;3] [8 &nbsp;1] &nbsp;&nbsp;[4 &nbsp;2] [7 &nbsp;6]</div>
<div style="color:var(--fg-mute);margin-left:3rem;">split &nbsp;split &nbsp;&nbsp;&nbsp;split &nbsp;split</div>
<div style="color:#10b981;margin-left:3rem;">[5][3] [8][1] &nbsp;&nbsp;[4][2] [7][6] &nbsp;<span style="color:var(--fg-mute);">base cases</span></div>
<div style="color:var(--fg-mute);margin-left:2rem;">merge &nbsp;merge &nbsp;&nbsp;&nbsp;merge &nbsp;merge</div>
<div style="color:#f59e0b;margin-left:2rem;">[3 5] [1 8] &nbsp;&nbsp;[2 4] [6 7]</div>
<div style="color:var(--fg-mute);margin-left:1rem;">merge &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;merge</div>
<div style="color:#f59e0b;margin-left:1rem;">[1 3 5 8] &nbsp;&nbsp;[2 4 6 7]</div>
<div style="color:var(--fg-mute);margin-left:0;">merge</div>
<div style="color:#00d4ff;">[1 2 3 4 5 6 7 8]</div>
</div>`,
        },
        { kind: "heading", text: "The merge operation" },
        {
          kind: "prose",
          html: `<p>The hard part of merge sort is not the splitting. It is the merging. Given two sorted arrays, compare their fronts and take the smaller element. Each comparison costs O(1) and produces one output element. Total comparisons per level: O(n). Total levels: log n. Total work: O(n log n).</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            { label: "best case", value: "O(n log n)", desc: "Always splits and merges. No early exit possible." },
            { label: "average", value: "O(n log n)", desc: "Guaranteed regardless of input order." },
            { label: "worst case", value: "O(n log n)", desc: "No pathological input pattern exists." },
            { label: "space", value: "O(n)", desc: "Needs temporary arrays for merging. The only weakness." },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// merge sort's space cost",
          body: `Merge sort needs O(n) extra memory to merge. On embedded systems with kilobytes of RAM, this matters more than the speed guarantee. On a server with 128 GB of RAM sorting a 10 MB file, it does not matter at all. Know your constraints.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMerge },
            c: { language: "c", code: cMerge },
          },
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The call stack grows exactly log n levels deep. At n = 1,000,000 that is about 20 stack frames. The recursion page showed why this is safe: each frame is small and predictable. Merge sort is why divide-and-conquer is not just an academic exercise. <a href="/recursion">← see: Recursion</a></p>`,
        },
        { kind: "heading", text: "Quicksort: the practical champion" },
        {
          kind: "prose",
          html: `<p>Merge sort is O(n log n) guaranteed. But quicksort is faster in practice. Because of cache behaviour. Merge sort needs temporary arrays. Every merge touches memory in two places. Quicksort sorts in place. It touches memory in one place. The CPU cache loves it.</p>
<p>The idea: pick one element as the <strong>pivot</strong>. Rearrange so every element smaller than the pivot is on its left, every larger element is on its right. The pivot is now in its exact final position. Recurse on each side.</p>`,
        },
        {
          kind: "raw",
          html: `<div style="background:var(--bg-2);border-radius:0.5rem;padding:1rem 1.25rem;font-family:var(--font-mono);font-size:0.78rem;line-height:2;overflow-x:auto;">
<div style="color:var(--fg-mute);margin-bottom:0.5rem;font-size:0.65rem;letter-spacing:0.08em;">// quicksort partition — pivot = last element</div>
<div><span style="color:var(--fg);">[3 &nbsp;6 &nbsp;8 &nbsp;10 &nbsp;1 &nbsp;2</span> &nbsp;<span style="background:#f59e0b22;color:#f59e0b;padding:0.1rem 0.3rem;border-radius:3px;">1</span>]&nbsp;&nbsp;<span style="color:var(--fg-mute);">pivot = 1 (last)</span></div>
<div style="color:var(--fg-mute);">partition: move everything &lt; 1 left...</div>
<div>[<span style="color:#10b981;">1</span> &nbsp;| &nbsp;<span style="color:var(--fg);">1 &nbsp;2 &nbsp;3 &nbsp;6 &nbsp;8 &nbsp;10</span>]&nbsp;&nbsp;<span style="color:#10b981;">pivot in final position</span></div>
<div style="color:var(--fg-mute);">recurse on left: [1] -- already sorted</div>
<div style="color:var(--fg-mute);">recurse on right: [1 2 3 6 8 10] -- repeat</div>
</div>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            { label: "best case", value: "O(n log n)", desc: "Pivot always splits array in half." },
            { label: "average", value: "O(n log n)", desc: "Random data. Expected with good pivot selection." },
            { label: "worst case", value: "O(n²)", desc: "Always picking min or max as pivot. Sorted input with naive pivot." },
            { label: "space", value: "O(log n)", desc: "In-place. Only the call stack grows, log n deep." },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustQuick },
            c: { language: "c", code: cQuick },
          },
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Quicksort's worst case O(n²) is not theoretical. C's qsort() has historically hit O(n²) on sorted input. This is why production systems replaced pure quicksort. pdqsort detects the bad pattern and switches algorithms. The compile-vs-runtime page's lesson applies here too: behaviour that looks fine at compile time (sorted input) can blow up at runtime. <a href="/compile-vs-runtime">← see: Compile vs Runtime</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "What your language **actually** uses",
      blocks: [
        {
          kind: "prose",
          html: `<p>You now know bubble sort, merge sort, and quicksort. Your language uses none of them. It uses a hybrid. An algorithm designed by studying the real-world data that programs actually sort in production. This section explains what that hybrid is and why pure algorithms lose to pragmatism.</p>`,
        },
        { kind: "heading", text: "Timsort: for real-world data" },
        {
          kind: "prose",
          html: `<p>Used by Python, Java (for objects), Android, and Swift. Invented by Tim Peters in 2002 for Python.</p>
<p>The key insight: real-world data is rarely random. It has natural runs -- sequences already sorted or reversely sorted. Timsort exploits this.</p>
<ol>
  <li>Scan the array for natural runs (already-sorted sequences, ascending or descending).</li>
  <li>If a run is too short, extend it with insertion sort -- fastest algorithm on tiny arrays.</li>
  <li>Merge the runs using merge sort's merge operation.</li>
</ol>
<p>Result: O(n) on already-sorted data (one big run, done). O(n log n) worst case. Stable. Adaptive.</p>`,
        },
        { kind: "heading", text: "pdqsort: for raw speed" },
        {
          kind: "prose",
          html: `<p>Used by Rust's <code>.sort_unstable()</code>, C++ Boost.Sort, Go's <code>slices.Sort()</code>. Invented by Orson Peters in 2021.</p>
<p>Pattern-Defeating Quicksort. Pure quicksort has pathological cases: sorted input, reverse sorted, all equal elements. pdqsort detects these patterns and switches strategy.</p>
<ol>
  <li>Start with quicksort (cache-friendly, fast average case).</li>
  <li>Detect bad patterns: many equal elements uses Dutch flag partition; recursion too deep switches to heapsort (O(n log n) guaranteed); small arrays use insertion sort.</li>
  <li>Each switch prevents worst-case behaviour.</li>
</ol>
<p>Result: O(n log n) worst case guaranteed. Fastest practical sort on random data. Not stable.</p>`,
        },
        { kind: "heading", text: "Standard library comparison" },
        {
          kind: "table",
          headers: ["Language", "Function", "Algorithm", "Stable", "Worst case"],
          rows: [
            ["Python", "sorted() / .sort()", "Timsort", "Yes", "O(n log n)"],
            ["Java", "Arrays.sort() (objects)", "Timsort", "Yes", "O(n log n)"],
            ["Rust", ".sort()", "Timsort", "Yes", "O(n log n)"],
            ["Rust", ".sort_unstable()", "pdqsort", "No", "O(n log n)"],
            ["C", "qsort()", "Usually quicksort", "No", "O(n²) possible"],
            ["C++", "std::sort()", "Introsort", "No", "O(n log n)"],
            ["Go", "slices.Sort()", "pdqsort", "No", "O(n log n)"],
          ],
        },
        { kind: "heading", text: "When to use what" },
        {
          kind: "raw",
          html: `<div style="background:var(--bg-2);border-radius:0.5rem;padding:1.25rem;font-family:var(--font-mono);font-size:0.75rem;line-height:2;overflow-x:auto;">
<div style="color:var(--fg-mute);font-size:0.65rem;letter-spacing:0.08em;margin-bottom:0.75rem;">// the decision tree</div>
<div style="color:var(--fg);">need stable sort?</div>
<div style="margin-left:1.25rem;color:var(--fg);">YES <span style="color:#818cf8;">--&gt;</span> Timsort / Merge Sort &nbsp;<span style="color:var(--fg-mute);">Python sorted(), Java Arrays.sort(), Rust .sort()</span></div>
<div style="margin-left:1.25rem;color:var(--fg);">NO &nbsp;<span style="color:#818cf8;">--&gt;</span> need O(n^2) worst-case protection?</div>
<div style="margin-left:2.5rem;color:var(--fg);">YES <span style="color:#818cf8;">--&gt;</span> pdqsort / Introsort &nbsp;<span style="color:var(--fg-mute);">Rust .sort_unstable(), C++ std::sort()</span></div>
<div style="margin-left:2.5rem;color:var(--fg);">NO &nbsp;<span style="color:#818cf8;">--&gt;</span> Quicksort &nbsp;<span style="color:var(--fg-mute);">cache-friendly, fast average case</span></div>
<div style="margin-top:0.75rem;color:var(--fg);">n &lt; 16?</div>
<div style="margin-left:1.25rem;color:#10b981;">always Insertion Sort &nbsp;<span style="color:var(--fg-mute);">every sort above switches to it below n=16</span></div>
</div>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustStdlib },
            c: { language: "c", code: cStdlib },
          },
        },
        { kind: "heading", text: "Sorting in the Bitcoin mempool" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin miner sorts transactions before building a block.</p>
<p>The goal is to maximise revenue within the block size limit (4 MB weight). The sort key is <strong>fee rate</strong>: satoshis per virtual byte. Higher fee rate goes in the block first. Lower fee rate waits for the next block. When the mempool is full, transactions below the threshold fee rate are evicted entirely.</p>
<p>This sort runs on every new block. Every ten minutes. Across thousands of mining nodes. Simultaneously.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMempool },
            c: { language: "c", code: cMempool },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the most consequential sort in finance",
          body: `The algorithm that decides whose Bitcoin transaction confirms next is O(n log n). It runs every ten minutes on a global network. The sort key is satoshis per virtual byte. Outbid the threshold and your transaction confirms. Fall below it and you wait -- or get dropped entirely. Fee markets are sorting markets.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Bitcoin Core's mempool sort is the same qsort/sort_unstable pattern as any other array sort. The hashing page showed how transactions get unique IDs. The networking page showed how they propagate across the network. The OS page showed how the sort runs as a user-space process. All of those pages converge at this one array sort. <a href="/blockchain">← see: Blockchain</a> &nbsp; <a href="/hashing">← see: Hashing</a></p>`,
        },
        { kind: "heading", text: "Where sorting touches BitRoot" },
        {
          kind: "prose",
          html: `<p>Sorting does not exist in isolation. It runs on top of everything below it and feeds everything above it.</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            {
              label: "02 / binary",
              value: "Every comparison is binary",
              desc: "arr[j] > arr[j+1] compiles to a SUB instruction. The CPU checks the sign bit. Sorting is binary arithmetic at billions of operations per second.",
              href: "/binary",
            },
            {
              label: "11 / arrays",
              value: "The required structure",
              desc: "Sorting only makes sense on arrays. O(1) index access lets merge sort read arr[mid] instantly. On a linked list that would be O(n). Contiguous memory is what makes comparison sorts practical.",
              href: "/arrays",
            },
            {
              label: "06 / memory",
              value: "In-place vs extra space",
              desc: "Bubble sort: O(1) extra memory. Merge sort: O(n) extra memory. Every sort algorithm choice is also a memory trade-off.",
              href: "/memory",
            },
            {
              label: "14 / recursion",
              value: "Merge sort is recursion",
              desc: "Base case: one element is sorted. Recursive step: sort each half. The call stack grows log n deep. At n = 1,000,000: 20 levels. Safe and predictable.",
              href: "/recursion",
            },
            {
              label: "15 / big o",
              value: "The proven ceiling",
              desc: "O(n log n) is the mathematical ceiling for comparison sorts. The gap between O(n squared) and O(n log n) is 25,000x at one million elements. Sorting is the canonical Big O example.",
              href: "/big-o",
            },
            {
              label: "09 / pointers",
              value: "qsort takes void*",
              desc: "In C every array parameter is a pointer. void bubble_sort(int *arr, int n) -- arr is the address of the first element. qsort() takes void* -- untyped pointers. Rust generics replace void* with type safety.",
              href: "/pointers",
            },
            {
              label: "13 / hashing",
              value: "Sorting vs hashing",
              desc: "Both solve fast data retrieval. Sorted array + binary search: O(log n) lookup. Hash map: O(1) lookup. Sort once: O(n log n) up front. The hashing page explains when to use which.",
              href: "/hashing",
            },
            {
              label: "07 / operating system",
              value: "The scheduler sorts",
              desc: "The OS scheduler sorts processes by priority, wait time, and virtual runtime. CFS always runs the process with the least CPU time -- a sort on a run queue, running every millisecond.",
              href: "/operating-system",
            },
            {
              label: "10 / distributed systems",
              value: "External merge sort",
              desc: "Sorting distributed data: each node has a sorted partition. Merging k sorted partitions is O(n log k). This is external merge sort -- how databases sort data larger than RAM.",
              href: "/distributed-systems",
            },
            {
              label: "19 / blockchain",
              value: "Mempool fee sort",
              desc: "Bitcoin miners sort the mempool by fee rate. Highest satoshis per virtual byte confirms first. O(n log n) on the most consequential array in the history of finance.",
              href: "/blockchain",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x17",
    title: "Data that branches: binary trees and why the filesystem is one",
    href: "/trees",
    label: "trees",
    variant: "cyan",
  },
};
