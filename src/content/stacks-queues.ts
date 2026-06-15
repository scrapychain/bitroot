import type { PageContent } from "@/types/content";

const rustBeginner = `// A stack built on Vec.
// Vec::push and Vec::pop are O(1) amortised.
// This is why std::collections has no Stack type:
// Vec already is one.
fn stack_demo() {
    let mut stack: Vec<i32> = Vec::new();

    // push: add to the top
    stack.push(10);
    stack.push(20);
    stack.push(30);
    // stack is now [10, 20, 30], top = 30

    // peek: look without removing
    if let Some(&top) = stack.last() {
        println!("top: {top}"); // 30
    }

    // pop: remove from the top
    while let Some(val) = stack.pop() {
        println!("{val}"); // 30, then 20, then 10
    }
    // LIFO: last in (30) is first out
}

// A queue built on VecDeque.
// VecDeque is a ring buffer: O(1) push_back and pop_front.
use std::collections::VecDeque;

fn queue_demo() {
    let mut queue: VecDeque<i32> = VecDeque::new();

    // enqueue: add to the back
    queue.push_back(10);
    queue.push_back(20);
    queue.push_back(30);
    // queue is now [10, 20, 30], front = 10

    // peek: look at the front without removing
    if let Some(&front) = queue.front() {
        println!("front: {front}"); // 10
    }

    // dequeue: remove from the front
    while let Some(val) = queue.pop_front() {
        println!("{val}"); // 10, then 20, then 30
    }
    // FIFO: first in (10) is first out
}`;

const cBeginner = `/*
 * Stack: array-based, fixed capacity.
 * C has no generic stack in the standard library.
 * You build it yourself. Every time.
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

#define STACK_MAX 256

typedef struct {
    int32_t data[STACK_MAX];
    int     top;  /* index of top element, -1 if empty */
} Stack;

void stack_init(Stack *s)        { s->top = -1; }
int  stack_empty(const Stack *s) { return s->top == -1; }
int  stack_full(const Stack *s)  { return s->top == STACK_MAX - 1; }

int stack_push(Stack *s, int32_t val) {
    if (stack_full(s)) return 0; /* overflow */
    s->data[++s->top] = val;
    return 1;
}

int stack_pop(Stack *s, int32_t *out) {
    if (stack_empty(s)) return 0; /* underflow */
    *out = s->data[s->top--];
    return 1;
}

int stack_peek(const Stack *s, int32_t *out) {
    if (stack_empty(s)) return 0;
    *out = s->data[s->top];
    return 1;
}
/* All operations O(1). No allocation after init. */
/* C trusts you to check return values.           */
/* Overflow and underflow are silent if you dont. */

/*
 * Queue: ring buffer, fixed capacity.
 * The ring buffer avoids shifting elements on dequeue.
 * head advances on dequeue, tail on enqueue.
 * When they wrap around, O(1) still holds.
 */
#define QUEUE_MAX 256

typedef struct {
    int32_t data[QUEUE_MAX];
    int     head;   /* index of front element  */
    int     tail;   /* index of next free slot  */
    int     count;
} Queue;

void queue_init(Queue *q)        { q->head = q->tail = q->count = 0; }
int  queue_empty(const Queue *q) { return q->count == 0; }
int  queue_full(const Queue *q)  { return q->count == QUEUE_MAX; }

int queue_enqueue(Queue *q, int32_t val) {
    if (queue_full(q)) return 0;
    q->data[q->tail] = val;
    q->tail = (q->tail + 1) % QUEUE_MAX; /* wrap around */
    q->count++;
    return 1;
}

int queue_dequeue(Queue *q, int32_t *out) {
    if (queue_empty(q)) return 0;
    *out = q->data[q->head];
    q->head = (q->head + 1) % QUEUE_MAX; /* wrap around */
    q->count--;
    return 1;
}
/* Ring buffer: O(1) for both enqueue and dequeue. */
/* No element shifting. No memory reallocation.    */`;

const rustInter = `// Rust's VecDeque is a ring buffer: O(1) at both ends.
// Use it whenever you need a queue.
// Never use Vec for a queue (O(n) shift on remove).
use std::collections::VecDeque;

fn deque_as_stack_and_queue() {
    let mut deque: VecDeque<&str> = VecDeque::new();

    // used as a queue (FIFO)
    deque.push_back("first");
    deque.push_back("second");
    deque.push_back("third");
    assert_eq!(deque.pop_front(), Some("first")); // FIFO

    // the same type used as a stack (LIFO)
    deque.push_back("new");
    assert_eq!(deque.pop_back(), Some("new"));     // LIFO

    // a Rust deque is indexable too
    println!("{:?}", deque[0]); // "second"
    // O(1) index access via ring-buffer arithmetic
}

// Priority queue: elements leave by priority, not arrival.
// Rust: BinaryHeap. Max-heap by default.
use std::collections::BinaryHeap;

fn priority_queue_demo() {
    // We want the highest fee first, so a max-heap is correct.
    let mut mempool: BinaryHeap<u64> = BinaryHeap::new();

    // transactions entering the mempool
    mempool.push(100); // 100 sat/vbyte
    mempool.push(500); // 500 sat/vbyte
    mempool.push(250); // 250 sat/vbyte

    // a miner picks the highest-fee transaction first
    while let Some(fee_rate) = mempool.pop() {
        println!("mine tx with fee_rate: {fee_rate} sat/vbyte");
        // output: 500, then 250, then 100
    }
    // This is exactly what Bitcoin miners do.
    // The mempool is a priority queue ordered by fee rate.
}`;

const cInter = `/*
 * Priority queue using a binary heap.
 * Bitcoin miners need this to pick the
 * highest-fee transactions first.
 * A plain queue gives arrival order.
 * A sorted array costs O(n) inserts.
 * A binary heap gives O(log n) insert and O(log n) extract.
 */
#include <stdint.h>
#include <string.h>

#define HEAP_MAX 1024

typedef struct {
    uint64_t fee_rate;  /* satoshis per virtual byte */
    uint8_t  txid[32];
    uint32_t size_vbytes;
} TxEntry;

typedef struct {
    TxEntry data[HEAP_MAX];
    int     size;
} MaxHeap;

/* Swap two entries. */
static void swap(TxEntry *a, TxEntry *b) {
    TxEntry tmp = *a; *a = *b; *b = tmp;
}

/* Insert a transaction. O(log n). */
void heap_push(MaxHeap *h, TxEntry entry) {
    if (h->size >= HEAP_MAX) return;
    h->data[h->size] = entry;
    int i = h->size++;

    /* bubble up: keep the max-heap property */
    while (i > 0) {
        int parent = (i - 1) / 2;
        if (h->data[parent].fee_rate < h->data[i].fee_rate) {
            swap(&h->data[parent], &h->data[i]);
            i = parent;
        } else break;
    }
}

/* Extract the highest-fee transaction. O(log n). */
TxEntry heap_pop(MaxHeap *h) {
    TxEntry top = h->data[0];
    h->data[0] = h->data[--h->size];

    /* sift down: restore the max-heap property */
    int i = 0;
    for (;;) {
        int l = 2*i + 1, r = 2*i + 2, largest = i;
        if (l < h->size && h->data[l].fee_rate > h->data[largest].fee_rate) largest = l;
        if (r < h->size && h->data[r].fee_rate > h->data[largest].fee_rate) largest = r;
        if (largest == i) break;
        swap(&h->data[i], &h->data[largest]);
        i = largest;
    }
    return top;
    /* the miner calls this to get the next transaction */
}`;

const rustAdv = `// Monotonic stack: the next greater element.
// For each element, find the next one larger than it.
// Used in histogram problems, temperature problems,
// compiler optimisations, and event processing.
fn next_greater(arr: &[i32]) -> Vec<i32> {
    let n = arr.len();
    let mut result = vec![-1; n];       // -1 means none
    let mut stack: Vec<usize> = Vec::new(); // holds indices

    for i in 0..n {
        // while the current element beats the top index,
        // that index has found its next greater element
        while let Some(&top) = stack.last() {
            if arr[i] > arr[top] {
                result[top] = arr[i];
                stack.pop();
            } else {
                break;
            }
        }
        stack.push(i);
    }
    result
    // O(n): each element is pushed and popped at most once.
    // amortised O(1) each, despite the inner loop.
}

// A thread-safe queue using standard-library channels.
// Rust channels are lock-free queues internally.
use std::sync::mpsc;
use std::thread;

fn producer_consumer() {
    let (tx, rx) = mpsc::channel::<i32>();

    // producer: enqueues work
    let producer = thread::spawn(move || {
        for i in 0..10 {
            tx.send(i).unwrap(); // O(1) amortised, lock-free
        }
    });

    // consumer: dequeues and processes
    let consumer = thread::spawn(move || {
        while let Ok(val) = rx.recv() {
            println!("processing: {val}");
        }
    });

    producer.join().unwrap();
    consumer.join().unwrap();
    // The same producer-consumer pattern as the OS scheduler:
    // your processes are producers, the scheduler is the consumer,
    // the run queue is the channel between them.
}`;

const cAdv = `/*
 * Monotonic stack in C: the next greater element.
 * Same algorithm, explicit stack management.
 */
#include <stdlib.h>
#include <string.h>

void next_greater(const int *arr, size_t n, int *result) {
    memset(result, -1, n * sizeof *result);

    int *stack = malloc(n * sizeof *stack); /* index stack */
    int  top   = -1;

    for (size_t i = 0; i < n; i++) {
        while (top >= 0 && arr[i] > arr[stack[top]]) {
            result[stack[top--]] = arr[i];
        }
        stack[++top] = (int)i;
    }
    free(stack);
    /* O(n) total: each index pushed and popped once. */
    /* C: you manage the stack memory by hand.        */
    /* Rust: Vec<usize> manages it for you.           */
}

/*
 * The Bitcoin Core thread-queue pattern.
 * The net thread enqueues messages.
 * The validation thread dequeues and processes them.
 * Simplified here without the threading primitives.
 */
typedef struct MsgNode {
    char            *payload;
    struct MsgNode  *next;
} MsgNode;

typedef struct {
    MsgNode *head;
    MsgNode *tail;
    /* real code also holds: pthread_mutex_t lock; */
    /* real code also holds: sem_t           items; */
} ThreadQueue;

void tq_enqueue(ThreadQueue *q, char *payload) {
    MsgNode *node = malloc(sizeof *node);
    node->payload = payload;
    node->next    = NULL;
    if (q->tail) q->tail->next = node;
    else         q->head = node;
    q->tail = node;
    /* O(1): append to the linked-list tail */
}

char *tq_dequeue(ThreadQueue *q) {
    if (!q->head) return NULL;
    MsgNode *node    = q->head;
    char    *payload = node->payload;
    q->head = node->next;
    if (!q->head) q->tail = NULL;
    free(node);
    return payload;
    /* O(1): remove from the linked-list head */
}`;

const rustBitcoin = `use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Eq, PartialEq)]
struct MempoolEntry {
    fee_rate:    u64,   // sat/vbyte, higher is better
    size_vbytes: u32,
    txid:        [u8; 32],
}

impl Ord for MempoolEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        // max-heap: the highest fee rate is extracted first
        self.fee_rate.cmp(&other.fee_rate)
    }
}
impl PartialOrd for MempoolEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn build_block(
    mempool: &mut BinaryHeap<MempoolEntry>,
    block_weight_limit: u32,
) -> Vec<MempoolEntry> {
    let mut block = Vec::new();
    let mut weight_used = 0u32;

    while let Some(entry) = mempool.pop() {
        // pop() extracts the highest fee_rate: O(log n)
        if weight_used + entry.size_vbytes > block_weight_limit {
            mempool.push(entry); // does not fit, put it back
            break;
        }
        weight_used += entry.size_vbytes;
        block.push(entry);
    }
    block
    // This is what decides whose transaction confirms.
    // The priority queue decides financial priority.
}`;

const cBitcoin = `/*
 * Same algorithm, explicit heap management.
 * Reuses the MaxHeap, TxEntry, and heap_pop
 * from the level 02 priority queue above.
 */
void build_block_c(MaxHeap *mempool,
                   uint32_t  weight_limit,
                   TxEntry  *block_out,
                   int      *block_size_out) {
    *block_size_out = 0;
    uint32_t used = 0;

    while (mempool->size > 0) {
        TxEntry top = mempool->data[0];      /* peek at the max */
        if (used + top.size_vbytes > weight_limit) break;
        heap_pop(mempool);                   /* extract max: O(log n) */
        block_out[(*block_size_out)++] = top;
        used += top.size_vbytes;
    }
    /* highest fee rate first, until the block is full */
}`;

const pre = `<pre style="background:var(--bg-2);border:1px solid var(--line-strong);border-radius:10px;padding:14px 16px;overflow-x:auto;font-family:var(--font-mono);font-size:12px;line-height:1.5;color:var(--fg);margin:0">`;

export const stacksQueues: PageContent = {
  slug: "stacks-queues",
  hexLabel: "0x18",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x18 / stacks-queues",
    title: `Two rules each.<br><span class="highlight">Everything else follows.</span>`,
    lede: `A stack remembers where you came from. A queue decides who goes next. You have been using both since page six: the call stack is a stack, the OS scheduler is a queue, the packet buffer is a queue. This page names what you already know, and shows you what it can build.`,
    narrativeHtml: `<p>You have been using a stack since the first function call you ever made.</p>
<p>You just did not know it had a name.</p>
<p>Every time you call a function the CPU pushes a frame onto the call stack. Local variables. Return address. The pointer back to where execution resumes.</p>
<p>Every time a function returns, that frame is popped.</p>
<p>Push. Pop. Push. Pop.</p>
<p>The recursion page showed what happens when you push too many frames without ever popping. The stack overflows. The process dies.</p>
<p>That stack, the one the CPU has been managing since your program started, is the same data structure this page is about.</p>
<p>And a queue is everywhere you have ever waited.</p>
<p>The OS scheduler puts your process in a queue. The network card puts incoming packets in a queue. Bitcoin nodes put unconfirmed transactions in a queue before sorting them by fee.</p>
<p>You already know these systems. You just did not know they were all the same abstract shape.</p>
<p>A thing you can only add to one end, and remove from the other.</p>
<p>This page names the shapes. Then shows you how to build them. Then shows you where they have been hiding inside everything you have already learned.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The two **shapes**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Two constraints. Each one produces a completely different data structure.</p>
<p><strong>LIFO</strong>, last in, first out. The thing you added most recently is the thing you remove first. This is a <strong>stack</strong>.</p>
<p><strong>FIFO</strong>, first in, first out. The thing you added first is the thing you remove first. This is a <strong>queue</strong>.</p>
<p>One letter different in the acronym. Completely different behaviour, completely different use cases.</p>`,
        },
        { kind: "heading", text: "The stack" },
        {
          kind: "prose",
          html: `${pre}STACK (LIFO)

    push "A", then "B", then "C"

         TOP
       +-------+
       |   C   |  most recent  -> pop returns this first
       +-------+
       |   B   |
       +-------+
       |   A   |  pushed first -> last to leave
       +-------+

    pop -> "C", then "B", then "A"</pre>`,
        },
        {
          kind: "prose",
          html: `<p>Two operations that change it, and one that only looks:</p>
<ul>
  <li><code>push(item)</code> adds to the top.</li>
  <li><code>pop()</code> removes the top and returns it.</li>
  <li><code>peek()</code> reads the top without removing it.</li>
</ul>
<p>All three are <strong>O(1)</strong>. Always.</p>`,
        },
        { kind: "heading", text: "The queue" },
        {
          kind: "prose",
          html: `${pre}QUEUE (FIFO)

    enqueue "A", then "B", then "C"

    FRONT               BACK
    +-----+-----+-----+
    |  A  |  B  |  C  |
    +-----+-----+-----+
       ^              ^
    dequeue        enqueue
    from here      here

    dequeue -> "A", then "B", then "C"</pre>`,
        },
        {
          kind: "prose",
          html: `<ul>
  <li><code>enqueue(item)</code> adds to the back.</li>
  <li><code>dequeue()</code> removes the front and returns it.</li>
  <li><code>peek()</code> reads the front without removing it.</li>
</ul>
<p>All three are <strong>O(1) amortised</strong>. Always.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// you already have a stack",
          body: `The call stack from the memory page and the recursion page is a literal stack data structure. push_frame on a function call, pop_frame on a return. The CPU register called the stack pointer is the top-of-stack pointer. You have been using a stack for every program you have ever run.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, filename: "stacks_queues.rs" },
            c: { language: "c", code: cBeginner, filename: "stacks_queues.c" },
          },
        },
        { kind: "heading", text: "Try it: push, pop, enqueue, dequeue" },
        { kind: "widget", name: "stack-queue-visualiser" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Implementations and **tradeoffs**",
      blocks: [
        { kind: "heading", text: "Array-based vs linked-list-based" },
        {
          kind: "prose",
          html: `<p>Both shapes can sit on either foundation from the data-structure pages. The choice is the array-versus-linked-list tradeoff you already know, applied one level up.</p>`,
        },
        {
          kind: "table",
          headers: ["Implementation", "Push / pop", "Memory", "Cache", "Notes"],
          rows: [
            ["Array-based", "O(1) amortised", "Contiguous", "Friendly", "Fixed cap, or doubling growth"],
            ["Linked-list", "O(1)", "Scattered", "Hostile", "No overflow, no reallocation"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Amortised, because a dynamic array occasionally doubles and copies, which averages out to O(1) per push. The linked-list version never reallocates, but pays a cache miss on every node, exactly as the linked-list page warned.</p>`,
        },
        { kind: "heading", text: "The deque subsumes both" },
        {
          kind: "prose",
          html: `<p>A <strong>deque</strong> is a double-ended queue. It supports push and pop from <em>both</em> ends, all four in O(1). Rust calls it <code>VecDeque</code>; C++ calls it <code>std::deque</code>.</p>
<p>This is how many real queues are built, and it subsumes both shapes: one type gives you a stack and a queue at once. The OS uses deques for scheduling, taking work from the front and stealing it from the back.</p>`,
        },
        { kind: "heading", text: "Stack overflow is not a metaphor" },
        {
          kind: "prose",
          html: `<p>The call stack has a fixed size, set by the OS, usually 8MB on Linux. At roughly 200 bytes per frame that is about 40,000 nested calls before death.</p>
<p>This is exactly the recursion page, except now the structure has a name. A recursive function with no base case pushes frames forever onto the call stack. Which is a stack. Which overflows. Stack overflow is literally a stack that has overflowed.</p>`,
        },
        { kind: "heading", text: "Circular buffers keep dequeue at O(1)" },
        {
          kind: "prose",
          html: `<p>A naive array queue shifts every element left on dequeue: O(n) per removal, catastrophic at scale. The circular buffer fixes it with two pointers. Head advances on dequeue, tail advances on enqueue, and when either reaches the end it wraps to the beginning. No shifting, ever. O(1) guaranteed.</p>`,
        },
        {
          kind: "prose",
          html: `${pre}capacity 5, head = front, tail = next free slot

  start            [10][20][30][..][..]
                    ^head        ^tail

  dequeue 10       [..][20][30][..][..]
                        ^head    ^tail

  enqueue 40, 50   [..][20][30][40][50]
                        ^head            ^tail

  enqueue 60       [60][20][30][40][50]
                    ^tail (wrapped)
                        ^head</pre>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, filename: "deque_and_heap.rs" },
            c: { language: "c", code: cInter, filename: "max_heap.c" },
          },
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Where stacks and queues **run the world**",
      blocks: [
        { kind: "heading", text: "The monotonic stack" },
        {
          kind: "prose",
          html: `<p>A <strong>monotonic stack</strong> keeps its contents in order: every element pushed is smaller (or larger) than everything beneath it. It answers next-greater-element questions, solves largest-rectangle-in-histogram, and underpins some compiler optimisations.</p>
<p>It costs O(n) total for n elements, because each element is pushed and popped at most once. Amortised O(1) each, even though there is an inner loop.</p>`,
        },
        { kind: "heading", text: "A deque for the sliding-window maximum" },
        {
          kind: "prose",
          html: `<p>Finding the maximum of every window of k elements is O(nk) the naive way. A deque does it in O(n). The deque holds indices: elements that fall out of the window are dropped from the front, smaller elements are dropped from the back, and the front is always the current maximum, whatever k is.</p>
<p>This runs in stream processing, real-time analytics, trading systems, and network monitoring.</p>`,
        },
        { kind: "heading", text: "Lock-free queues" },
        {
          kind: "prose",
          html: `<p>When many threads enqueue and dequeue at once, a mutex protects the queue but creates contention. <strong>Lock-free queues</strong> use atomic compare-and-swap instead: no mutex, no blocking, threads spin on a CAS until it succeeds. They run inside OS kernels, high-frequency trading, game engines, and the thread communication inside Bitcoin Core.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, filename: "monotonic_and_channel.rs" },
            c: { language: "c", code: cAdv, filename: "monotonic_and_queue.c" },
          },
        },
        { kind: "heading", text: "Stacks and queues in Bitcoin" },
        {
          kind: "prose",
          html: `<p>Bitcoin uses both. Every ten minutes. On every node. Across the whole network.</p>`,
        },
        { kind: "heading", text: "The call stack during validation" },
        {
          kind: "prose",
          html: `<p>When a node validates a block, the call stack looks like this:</p>
${pre}validate_block()
  validate_transactions()
    validate_transaction()
      verify_input()
        verify_signature()
          sha256_round()</pre>`,
        },
        {
          kind: "prose",
          html: `<p>Six frames deep. Each one pushed when called, each one popped when it returns. The same LIFO order, implemented by the CPU hardware, relied on by Bitcoin Core.</p>`,
        },
        { kind: "heading", text: "The mempool is a priority queue" },
        {
          kind: "prose",
          html: `<p>When transactions arrive at a node they enter the mempool, which is not a plain queue but a <strong>priority queue</strong> keyed on fee rate (satoshis per virtual byte). To build a block the miner calls extract-max repeatedly: highest fee first, then the next, until the block is full.</p>
<p>That is a binary max-heap. O(log n) to insert, O(log n) to extract the best. For 100,000 mempool entries that is about 17 operations, not 100,000. Not even close. The priority queue decides whose transaction confirms.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitcoin, filename: "build_block.rs" },
            c: { language: "c", code: cBitcoin, filename: "build_block.c" },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the network packet queue",
          body: `Every node keeps a receive queue per peer. The network thread enqueues incoming packets; the validation thread dequeues and processes them. That is the producer-consumer pattern: a FIFO queue between two threads, the network filling it, the validator draining it. When it is empty the validator waits; when it fills, back-pressure slows the sender. The queue absorbs the timing difference between the two, exactly like every buffer in every operating system ever written. Stacks and queues are not an academic exercise. They are the synchronisation mechanism between every layer of every system you have used.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where stacks and queues appear in ScrapyBytes",
    introHtml: `<p>Two shapes you have been using since page six. Here is where they surface across the rest of the curriculum.</p>`,
    items: [
      {
        slug: "memory",
        text: `The call stack is a memory region the OS hands your process, growing down from a high address. The memory page described the region; this page names the structure inside it.`,
      },
      {
        slug: "cpu",
        text: `The stack pointer is a CPU register, and PUSH and POP are native instructions. The CPU page is the hardware that runs a stack on every call and return.`,
      },
      {
        slug: "recursion",
        text: `Every recursive call pushes a frame; with no base case the stack fills and overflows. The recursion page showed the crash, and a stack overflow is literally a stack overflowing.`,
      },
      {
        slug: "operating-system",
        text: `The scheduler is a queue: processes wait in a run queue, take a slice, and requeue. Priority scheduling is the same max-heap Bitcoin uses for fees. The operating system page runs on this one.`,
      },
      {
        slug: "variables",
        text: `A stack frame is a block of local variables, pushed on entry and popped on return. The variables page showed where they live; this page is the structure that holds them.`,
      },
      {
        slug: "pointers",
        text: `The return address on a frame is a pointer, and popping a frame follows it back. The pointers page explained the overflow attacks that overwrite exactly that address.`,
      },
      {
        slug: "arrays",
        text: `An array-backed stack is the fastest: push and pop at the end, O(1) amortised, the same Vec the arrays page built. Queues just need the ring-buffer trick on top.`,
      },
      {
        slug: "linked-list",
        text: `A linked-list stack pushes and pops the head in O(1) with no overflow risk, and a tail pointer makes a linked queue O(1) too. The linked-list page is the other implementation.`,
      },
      {
        slug: "sorting",
        text: `A priority queue dequeues in sorted order, and heap sort is built on exactly that heap. Insert n then extract n is O(n log n), the sorting ceiling from the sorting page.`,
      },
      {
        slug: "big-o",
        text: `Stack and queue operations are O(1), and a priority queue is O(log n). The big-o page named the costs these structures consistently hit at their best.`,
      },
      {
        slug: "hashing",
        text: `A chained hash map hangs colliding keys off a linked list per bucket, the same structure a linked queue uses. The hashing page is one place this list shows up.`,
      },
      {
        slug: "networking",
        text: `Every network card has a receive queue that buffers packets until the stack drains them, reordering by sequence number. The networking page's packets are what these queues keep in order.`,
      },
      {
        slug: "distributed-systems",
        text: `Message queues like Kafka and SQS are how distributed nodes communicate without direct synchronisation. The distributed systems page is these queues at planetary scale.`,
      },
      {
        slug: "binary",
        text: `Every value on the stack is binary, the stack pointer is a binary address, and a frame boundary is a binary offset. The binary page is what these structures actually hold.`,
      },
      {
        slug: "blockchain",
        text: `The Bitcoin mempool is a priority queue ordered by fee rate, O(log n) to insert and to extract the max. The blockchain page is the miner calling extract-max to fill a block.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x19",
    title: "Data that branches: binary trees, Merkle trees, and how databases index everything.",
    href: "/trees",
    label: "trees",
    variant: "magenta",
  },
};
