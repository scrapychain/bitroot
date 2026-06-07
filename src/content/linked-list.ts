import type { PageContent } from "@/types/content";

const rustBasic = `// A singly linked list of i32, written from first principles.
// Each node owns a heap-allocated Box pointing at the next node.
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    // Build  10 -> 20 -> 30 -> Nil
    let list = Cons(10,
              Box::new(Cons(20,
              Box::new(Cons(30,
              Box::new(Nil))))));

    // Walk it. Each step is a pointer dereference into the heap.
    let mut cursor = &list;
    while let Cons(value, next) = cursor {
        println!("{value}");
        cursor = next;
    }
}`;

const cBasic = `#include <stdio.h>
#include <stdlib.h>

// The classic C linked-list node. value + pointer to the next.
typedef struct Node {
    int value;
    struct Node *next;
} Node;

int main(void) {
    // Build 10 -> 20 -> 30 -> NULL, one malloc per node.
    Node *c = malloc(sizeof *c); c->value = 30; c->next = NULL;
    Node *b = malloc(sizeof *b); b->value = 20; b->next = c;
    Node *a = malloc(sizeof *a); a->value = 10; a->next = b;

    // Walk it. Pointer chase, one node at a time.
    for (Node *p = a; p != NULL; p = p->next)
        printf("%d\\n", p->value);

    // Each node was allocated separately; each one has to be freed.
    free(a); free(b); free(c);
    return 0;
}`;

const rustInsert = `// Insert a node after a given position. O(1) once you have the
// predecessor; getting there is O(n) if you start from the head.
struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

fn insert_after(prev: &mut Node, value: i32) {
    // Splice the new node in: take prev's old next, hand it to the new
    // node, then point prev at the new node. Two pointer writes.
    let old_next = prev.next.take();
    let new_node = Box::new(Node { value, next: old_next });
    prev.next = Some(new_node);
}

fn main() {
    let mut head = Node {
        value: 10,
        next: Some(Box::new(Node { value: 30, next: None })),
    };
    // Insert 20 between 10 and 30.
    insert_after(&mut head, 20);

    let mut cursor = Some(&head);
    while let Some(n) = cursor {
        println!("{}", n.value);
        cursor = n.next.as_deref();
    }
}`;

const cInsert = `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

// Insert a new node right after \`prev\`. No nodes are shifted.
void insert_after(Node *prev, int value) {
    Node *n = malloc(sizeof *n);
    n->value = value;
    n->next  = prev->next;   // splice: new -> what prev used to point at
    prev->next = n;          // and prev now points at new
}

int main(void) {
    Node *c = malloc(sizeof *c); c->value = 30; c->next = NULL;
    Node *a = malloc(sizeof *a); a->value = 10; a->next = c;

    // Insert 20 between 10 and 30. O(1): only two pointer writes.
    insert_after(a, 20);

    for (Node *p = a; p != NULL; p = p->next) printf("%d\\n", p->value);

    // (cleanup elided for brevity)
    return 0;
}`;

const rustDoubly = `// A doubly linked list is the same idea with a backward pointer too.
// Note: a safe Rust DLL needs Rc<RefCell<...>> or unsafe pointers
// because each node has two owners. This is the cleanest sketch.
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
    prev: Option<Weak<RefCell<Node>>>, // Weak: avoid a cycle in refcounts
}

// Building a doubly linked list in safe Rust is genuinely awkward.
// In production code, reach for std::collections::LinkedList<T> or,
// more often, a Vec + indices acting as "pointers" into the same Vec.`;

const cDoubly = `#include <stdlib.h>

// A doubly linked node. Two pointer fields instead of one.
typedef struct DNode {
    int value;
    struct DNode *prev;
    struct DNode *next;
} DNode;

// Insert a node right after \`prev\`. Update four pointers.
void dll_insert_after(DNode *prev, int value) {
    DNode *n = malloc(sizeof *n);
    n->value = value;
    n->prev  = prev;
    n->next  = prev->next;
    if (prev->next) prev->next->prev = n;
    prev->next = n;
}

// Remove a node from anywhere. O(1) given the node itself; no traversal.
void dll_remove(DNode *node) {
    if (node->prev) node->prev->next = node->next;
    if (node->next) node->next->prev = node->prev;
    free(node);
}`;

const rustVecBased = `// "Linked list" without any malloc per node. The arena owns the
// storage; indices play the role of pointers.
//
// This is how serious systems do it: the OS scheduler, the Linux
// kernel's task_struct list, ECS game engines, lock-free queues.
struct Arena {
    nodes: Vec<Node>,
}

#[derive(Clone, Copy)]
struct NodeId(usize);

struct Node {
    value: i32,
    next: Option<NodeId>,
}

impl Arena {
    fn push(&mut self, value: i32, after: Option<NodeId>) -> NodeId {
        let id = NodeId(self.nodes.len());
        self.nodes.push(Node { value, next: None });
        if let Some(prev) = after {
            self.nodes[id.0].next = self.nodes[prev.0].next;
            self.nodes[prev.0].next = Some(id);
        }
        id
    }
}

// Three reasons this layout is usually faster than the heap version:
//  1. One contiguous Vec: far better cache behaviour on iteration.
//  2. One allocation amortised, not one per node.
//  3. Indices are 32-bit; pointers are 64-bit. Half the metadata.`;

const cArenaBased = `#include <stdint.h>

// Same idea in C: nodes live in one array, "pointers" are 32-bit indices.
#define ARENA_CAP 1024
#define NIL UINT32_MAX

typedef struct {
    int      value;
    uint32_t next;       // index into arena, or NIL
} ANode;

static ANode    arena[ARENA_CAP];
static uint32_t arena_len = 0;

uint32_t a_alloc(int value, uint32_t after) {
    uint32_t id = arena_len++;
    arena[id].value = value;
    arena[id].next  = NIL;
    if (after != NIL) {
        arena[id].next     = arena[after].next;
        arena[after].next  = id;
    }
    return id;
}`;

const cBlockchain = `#include <stdint.h>
#include <string.h>

/* A Bitcoin block header - 80 bytes.
 * The linked list node of the blockchain. */
typedef struct __attribute__((packed)) {
    uint32_t version;
    uint8_t  prev_hash[32]; /* the next pointer */
                            /* except it is a hash */
                            /* not a memory address */
    uint8_t  merkle_root[32];
    uint32_t timestamp;
    uint32_t bits;
    uint32_t nonce;
} BlockHeader;

/* Walk the blockchain backwards from tip to genesis.
 * Same shape as walking a singly linked list.
 * Except prev_hash is looked up in a database
 * not dereferenced as a pointer. */
void walk_chain(
    const BlockHeader *tip,
    BlockHeader *(*find_by_hash)(const uint8_t[32])
) {
    const BlockHeader *current = tip;
    uint8_t genesis[32] = {0}; /* all-zero hash */

    while (current != NULL) {
        /* process block... */
        if (memcmp(current->prev_hash,
                   genesis, 32) == 0) break;
        /* follow the "pointer" */
        current = find_by_hash(current->prev_hash);
        /* in a regular linked list:
         *   current = current->next;
         * here:
         *   current = database_lookup(current->prev_hash);
         * same shape. different mechanism.
         * same O(n) to walk the whole chain. */
    }
}

/* The linked list property that matters:
 * change any block -> its hash changes ->
 * the next block's prev_hash no longer matches ->
 * the chain is broken from that point onward ->
 * every node rejects it.
 *
 * This is why you cannot rewrite Bitcoin history.
 * Not because of trust.
 * Because of linked list pointer integrity.
 * Enforced by SHA-256 instead of the OS. */`;

const rustBlockchain = `use std::collections::HashMap;

/* Each block is a linked list node. */
struct Block {
    header:       BlockHeader,
    transactions: Vec<Transaction>,
}

struct BlockHeader {
    version:     u32,
    prev_hash:   [u8; 32], // the linked list pointer
    merkle_root: [u8; 32],
    timestamp:   u32,
    bits:        u32,
    nonce:       u32,
}

/* The blockchain: a hash map for O(1) lookup
 * plus a linked list structure via prev_hash. */
struct Blockchain {
    blocks: HashMap<[u8; 32], Block>,
    tip:    [u8; 32],
}

impl Blockchain {
    fn walk_backwards(&self) -> Vec<&Block> {
        let mut chain  = Vec::new();
        let mut cursor = Some(self.tip);
        let genesis    = [0u8; 32];

        while let Some(hash) = cursor {
            // follow the prev_hash pointer,
            // same as node = node.next in a regular list
            match self.blocks.get(&hash) {
                None        => break,
                Some(block) => {
                    chain.push(block);
                    let ph = block.header.prev_hash;
                    cursor = if ph == genesis {
                        None           // genesis: end of chain
                    } else {
                        Some(ph)       // follow the pointer
                    };
                }
            }
        }
        chain
        // Rust: prev_hash is a [u8; 32] value type,
        // not a raw pointer. HashMap returns Option:
        // no null dereference possible, safe to any depth.
    }

    /* Verify chain integrity: every prev_hash must
     * resolve to a real block in the map.
     * This is what every Bitcoin node does on startup. */
    fn verify_integrity(&self) -> bool {
        for (_stored_hash, block) in &self.blocks {
            let ph = &block.header.prev_hash;
            if *ph == [0u8; 32] { continue; } // genesis
            match self.blocks.get(ph) {
                None    => return false, // broken link
                Some(_) => { /* link valid, continue */ }
            }
        }
        true
    }
}

/* The Bitcoin blockchain vs a memory linked list:
 *
 *   Regular list:  node->next  = memory address
 *   Blockchain:    block.prev  = SHA-256d(prev_header)
 *
 *   Regular list:  change node -> only breaks if
 *                  the parent checks pointer validity
 *   Blockchain:    change block -> hash changes ->
 *                  every later block's prev_hash
 *                  fails verification ->
 *                  the whole network rejects the fork
 *
 * The list is singly linked.
 * You walk it backwards: tip -> ... -> genesis.
 * Inserts happen only at the tip (mining a block).
 * Deletes never happen (immutable append-only).
 *
 * A linked list, made tamper-evident by replacing
 * memory addresses with cryptographic hashes.
 * That is the entire blockchain data structure. */`;

export const linkedList: PageContent = {
  slug: "linked-list",
  hexLabel: "0x0C",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x0C / structure",
    title: `A chain of <span class="highlight">somewheres.</span>`,
    lede: `An <strong>array</strong> is houses on a numbered street. A <strong>linked list</strong> is a treasure hunt: each node tells you, by address, where the next one lives. You give up the array's cheap indexing and cache locality. In return you get O(1) inserts and deletes anywhere, no resizing, no copying. That tradeoff has been keeping operating systems, schedulers, and lock-free queues alive for fifty years.`,
    narrativeHtml: `<p>On page eleven, every house sat on one street. Neighbours. Shoulder to shoulder. You found house five by counting from the corner.</p>
<p>Now scatter them.</p>
<p>Put one house downtown. One across the river. One in a suburb youve never visited. No order. No street. No way to count your way to anything.</p>
<p>So how do you find the next house?</p>
<p>You leave a note on each door. The note says one thing. Heres the address of the next one.</p>
<p>Thats a linked list. A chain of somewheres. Each node holding a value, and a pointer to wherever the next node happens to live.</p>
<p>You give something up. You cant jump to node five anymore. You start at the front and follow the notes, one door at a time. The cache locality you loved on page eleven is gone.</p>
<p>But you get something back. To insert a new house, you rewrite two notes. No shifting. No resizing. No copying a million boxes to make room for one.</p>
<p>That single tradeoff has kept operating systems and schedulers alive for fifty years.</p>
<p>And heres the part that should stop you cold.</p>
<p>The Bitcoin blockchain is a linked list. Each block carries a note pointing back to the block before it. Except the note isnt an address.</p>
<p>Its a cryptographic hash.</p>
<p>Change one block and every note behind it breaks.</p>
<p>Lets follow the chain.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Linked lists as a **chain of nodes**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Picture a row of post-it notes on a wall. Each note has a number on it, and an arrow drawn to wherever the next note happens to be: across the room, behind the couch, anywhere. To read them in order, you start at the first one and follow the arrows. That's a linked list.</p>
<p>A <strong>linked list</strong> is:</p>
<ul>
  <li>A <strong>chain of nodes</strong>, each one allocated separately.</li>
  <li>Every node holds <strong>a value</strong> and <strong>a pointer to the next node</strong>.</li>
  <li>The last node's next pointer is <strong>null</strong> (no next).</li>
  <li>The whole list is referenced by a <strong>head pointer</strong> at the start.</li>
</ul>
<p>Notice what's missing: there's no rule that says nodes are next to each other in memory. Each one lives wherever the allocator put it. The "ordering" exists only in the pointers, not in the addresses.</p>`,
        },
        { kind: "heading", text: "A picture of a singly linked list" },
        { kind: "diagram", name: "singly-linked-list" },
        {
          kind: "prose",
          html: `<p>Compare that to the array picture: same four values, but no contiguous block. Every <code>next</code> is a 64-bit heap address, not an offset. Walking the list is a sequence of <em>pointer chases</em>: read a node, follow its <code>next</code>, read the next node, follow <em>its</em> <code>next</code>, and so on.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the head pointer is the whole list",
          body: `In C the entire list is just one <code>Node *head</code>. In Rust it's an <code>Option&lt;Box&lt;Node&gt;&gt;</code>. Either way, that single pointer is enough; the rest of the list is reachable by following <code>next</code> from there. Lose the head pointer and you've leaked the list.`,
        },
        { kind: "heading", text: "Build one and walk it" },
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
          title: "// why this looks heavier than the array version",
          body: `Three nodes means three <code>malloc</code>s in C, and three <code>Box::new</code>s in Rust. Each one calls into the allocator, each one returns a 64-bit pointer. The "list" itself is the head plus those three heap blocks. Pause and feel that cost: a five-element <code>Vec&lt;i32&gt;</code> is one heap block. A five-element linked list is five heap blocks plus a head pointer.`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the memory page",
          body: `Every <code>next</code> pointer is a heap address, the kind described in the memory page's stack-vs-heap section. The head pointer lives on the stack (it's a local in <code>main</code>), but the nodes it leads to all live on the heap. That's why building a linked list is allocator-heavy: each <code>malloc</code> / <code>Box::new</code> is a separate trip into the allocator, with the bookkeeping cost the memory page warned about. A <code>Vec</code> pays that price once and re-uses the buffer; a linked list pays it on every push.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Each node lives at a heap address. That address is a hex number. <code>0x5591a2b30010</code> for node one. <code>0x5591a2b30030</code> for node two. Not next to each other. Not even close. The pointer in each node is the only thread connecting them. Eight bytes of binary number, pointing somewhere in the heap. This is the pointers page applied to a data structure. Every next field is a dereference. Every walk is a pointer chase. <a href="/pointers">← see: Pointers</a> · <a href="/memory">Memory</a></p>`,
        },
        { kind: "heading", text: "Build and walk the chain" },
        { kind: "widget", name: "linked-list-visualiser" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "How **inserts and deletes** actually work",
      blocks: [
        {
          kind: "prose",
          html: `<p>The whole appeal of a linked list is the operations on its <em>middle</em>. Inserting a value into the middle of an array means shifting every element after the insertion point. Inserting a value into the middle of a linked list means writing two pointers. No neighbours move.</p>`,
        },
        { kind: "heading", text: "Insertion: splice a node in" },
        { kind: "diagram", name: "linked-list-insert" },
        {
          kind: "prose",
          html: `<p>To insert <code>b</code> between <code>a</code> and <code>c</code>:</p>
<ol>
  <li>Allocate the new node and put <code>b</code>'s value in it.</li>
  <li>Set the new node's <code>next</code> to whatever <code>a.next</code> currently is (i.e. <code>c</code>).</li>
  <li>Set <code>a.next</code> to the new node.</li>
</ol>
<p>That's it. One allocation, two pointer writes. The cost doesn't depend on how long the list is. It's <strong>O(1)</strong> once you've got a reference to the predecessor. The catch is that "one allocation": the memory page warned that a heap allocation is hundreds to thousands of cycles, while the pointer writes are one each. The big-O is constant, but the constant is the allocator.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInsert },
            c: { language: "c", code: cInsert },
          },
        },
        { kind: "heading", text: "Deletion: bypass and free" },
        { kind: "diagram", name: "linked-list-delete" },
        {
          kind: "prose",
          html: `<p>To delete <code>b</code> from the middle of the list:</p>
<ol>
  <li>Find <code>b</code>'s <em>predecessor</em> (here, <code>a</code>).</li>
  <li>Point the predecessor's <code>next</code> at <code>b.next</code> instead of <code>b</code>.</li>
  <li>Free <code>b</code>.</li>
</ol>
<p>Same shape as insert: one pointer write on the predecessor, one <code>free</code>. Every other node stays exactly where it was.</p>`,
        },
        { kind: "heading", text: "The complexity table everyone memorises" },
        {
          kind: "table",
          headers: [
            "operation",
            "array / <code>Vec</code>",
            "singly linked",
            "doubly linked",
          ],
          rows: [
            [
              "<strong>random access</strong> <code>arr[i]</code>",
              "O(1), address math",
              "O(n), walk the chain",
              "O(n), walk the chain",
            ],
            [
              "<strong>push at end</strong>",
              "amortised O(1)",
              "O(n); needs the tail, unless you keep one",
              "O(1) with a tail pointer",
            ],
            [
              "<strong>push at front</strong>",
              "O(n), shift everything",
              "O(1)",
              "O(1)",
            ],
            [
              "<strong>insert at middle (given node)</strong>",
              "O(n), shift the suffix",
              "O(1)",
              "O(1)",
            ],
            [
              "<strong>delete at middle (given node)</strong>",
              "O(n), shift the suffix",
              "O(n); need predecessor",
              "O(1); predecessor is one hop away",
            ],
            [
              "<strong>iterate</strong>",
              "very fast, cache friendly",
              "slow: pointer chase, cache misses",
              "slow: same, plus extra bytes",
            ],
          ],
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Look at the random access row: O(n). The array page showed <code>arr[i]</code> is O(1) because <code>base + (i × stride)</code> is one instruction. A linked list has no base and no stride. To get node i you start at the head and count i pointer dereferences. The Big O page named this the hidden cost: the same O(n) classification as array iteration, but 5 to 50 times slower in practice. Linked lists are the canonical example of why Big O lies. <a href="/arrays">← see: Arrays</a> · <a href="/big-o">Big O Notation</a></p>`,
        },
        { kind: "heading", text: "Singly linked vs doubly linked" },
        { kind: "diagram", name: "doubly-linked-list" },
        {
          kind: "prose",
          html: `<p>A <strong>doubly linked list</strong> adds a <code>prev</code> pointer to every node. The cost is one extra pointer per node: 8 bytes on a 64-bit system. The benefit is two:</p>
<ul>
  <li>You can walk the list backwards as well as forwards.</li>
  <li>Given a reference to <em>any</em> node, you can delete it in O(1) without first finding its predecessor; the predecessor is just <code>node.prev</code>.</li>
</ul>
<p>That second property is why every "list with an index" structure ends up doubly linked. The LRU cache pattern (<code>HashMap&lt;K, &amp;Node&gt;</code> + doubly linked list) is the canonical example, and it shows up in CPU caches, browser caches, and database buffer pools.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustDoubly },
            c: { language: "c", code: cDoubly },
          },
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// why doubly linked lists are awkward in safe Rust",
          body: `Each node has two references to it (from its predecessor and its successor), and they're both mutable. Rust's borrow checker is allergic to that. The escape hatches are <code>Rc&lt;RefCell&lt;...&gt;&gt;</code> with <code>Weak</code> back-pointers, or raw <code>unsafe</code> pointers. In practice, Rust programmers reach for <code>Vec</code> + indices far more often than they reach for a literal doubly linked list. The standard library's <code>LinkedList&lt;T&gt;</code> exists but is rarely the right tool.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Safe Rust refuses to compile a doubly linked list because each node has two mutable references to it. The borrow checker sees this and says no. This is the compile vs runtime page in action. The bug that would corrupt memory in C at runtime is rejected by Rust at compile time. Doubly linked lists are the most famous example of Rust's ownership system fighting you. The language is not wrong to fight. <a href="/compile-vs-runtime">← see: Compile vs Runtime</a> · <a href="/pointers">Pointers</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "**Cache cost**, intrusive lists, and where linked lists actually live",
      blocks: [
        { kind: "heading", text: "The cache cost, made concrete" },
        {
          kind: "prose",
          html: `<p>The arrays page made the case already, but it bears repeating in the opposite direction. Walking an array of N ints is essentially N reads, almost all of which hit L1 cache because the CPU fetched whole cache lines and prefetched the next ones. Walking a linked list of N ints is N pointer chases. The CPU has no idea where the next node lives until it has read the current one's <code>next</code> field. Hardware prefetch can't help. Every step is a potential cache miss.</p>
<p>The numbers are sobering. A modern L1 hit is roughly 4 cycles. A main-memory fetch is 200-300 cycles, the memory hierarchy from the memory page, end to end. A linked list traversal can be <em>two orders of magnitude</em> slower than an array traversal of the same length, even though both are O(n). This is the most important "big-O lies" example to internalise.</p>
<p>It gets worse over time. A long-running program that does many <code>malloc</code> / <code>free</code> cycles ends up with <strong>heap fragmentation</strong>: the allocator returns free regions wherever it can find them, and the nodes of a list that was built incrementally end up scattered across the whole heap. The same list at startup might fit in a handful of cache lines; a week later it can be sprayed across megabytes of memory. The arrays page calls this locality, the memory page calls it fragmentation, and a linked list pays the price for both.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// rule of thumb",
          body: `If you're going to <em>iterate</em> the collection, prefer a <code>Vec</code>. If you're going to <em>splice middle elements in and out</em> a lot, and you have a stable pointer to where you want to splice, a linked list earns its keep. Most code does more iterating than splicing, which is why <code>Vec</code> wins by default.`,
        },
        { kind: "heading", text: "The other escape: arena-allocated lists" },
        {
          kind: "prose",
          html: `<p>You can have the linked-list <em>shape</em> without paying for the linked-list <em>allocation pattern</em>. The trick: store every node inside one big <code>Vec</code> (an <strong>arena</strong>), and use indices into that Vec where you would have used pointers.</p>
<ul>
  <li>Same O(1) splices, because changing a "next" still only touches two slots.</li>
  <li>Far better cache behaviour, because all the nodes live next to each other in one contiguous buffer.</li>
  <li>Smaller "pointers": 32-bit indices instead of 64-bit addresses.</li>
  <li>No <code>malloc</code> per node; one big amortised allocation.</li>
</ul>
<p>This is how the Linux kernel, game-engine ECS systems, and lock-free queues actually represent their lists. It is almost always what you want when you reach for a linked list in Rust.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustVecBased },
            c: { language: "c", code: cArenaBased },
          },
        },
        { kind: "heading", text: "Intrusive lists: the OS kernel's favourite trick" },
        {
          kind: "prose",
          html: `<p>One more pattern, and it's the one you'll see everywhere in serious systems code. An <strong>intrusive linked list</strong> moves the <code>next</code> (and optionally <code>prev</code>) pointers <em>into the data type itself</em>, instead of wrapping the data in a list node.</p>
<p>So a Linux <code>task_struct</code> (a process) contains:</p>
<ul>
  <li>The actual process state (pid, signals, file handles, scheduler info…)</li>
  <li>A field <code>struct list_head tasks;</code> that links it into the global process list.</li>
  <li>Another field <code>struct list_head children;</code> that links it into its parent's children list.</li>
  <li>And so on. The same struct lives in many lists at once.</li>
</ul>
<p>The benefit: no allocation overhead per "list node" because the node <em>is</em> the data. The downside: the data type has to know about the list. In C this is idiomatic; in Rust it requires <code>unsafe</code> or specialised crates.</p>`,
        },
        { kind: "heading", text: "Where linked lists actually win" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "operating systems",
              value: "Run queues, wait queues",
              desc: "The kernel scheduler maintains queues of runnable and blocked tasks. Tasks move between them constantly (every syscall, every interrupt). Intrusive doubly linked lists make this O(1) with no allocation in the hot path.",
            },
            {
              label: "memory allocators",
              value: "Free lists",
              desc: "Allocators like <code>malloc</code> and <code>jemalloc</code> maintain linked lists of free memory blocks of each size class. Allocation pops from the head, deallocation pushes onto the head; both O(1), both lock-free with the right design.",
            },
            {
              label: "concurrency",
              value: "Lock-free queues",
              desc: "MPSC and SPSC queues used in Tokio, in Rust's <code>std::sync::mpsc</code>, and in every game engine's job system are linked lists internally. The compare-and-swap on the head pointer is the whole synchronisation story.",
            },
            {
              label: "LRU caches",
              value: "Hash + doubly linked list",
              desc: "Every cache that evicts \"least recently used\" (CPU caches, OS page caches, your browser's resource cache, Redis with <code>maxmemory-policy allkeys-lru</code>) is a hashmap pointing into a doubly linked list of cache entries.",
            },
          ],
        },
        { kind: "heading", text: "When the answer is just 'don't'" },
        {
          kind: "prose",
          html: `<p>A linked list is almost never the right answer to <em>"I have a list of things"</em>. For that, you want a <code>Vec</code>, full stop. Use a linked list when one of these is true:</p>
<ul>
  <li>You will splice middle elements in and out of the structure frequently, and the splices dominate any iteration cost.</li>
  <li>You need stable references that survive other elements being added or removed.</li>
  <li>You're building an intrusive list where the node <em>is</em> the data.</li>
  <li>You're doing lock-free concurrent work that depends on atomic pointer swaps.</li>
</ul>
<p>If none of those are true, a <code>Vec</code> or a <code>VecDeque</code> will beat a linked list on every dimension that matters.</p>`,
        },
        { kind: "heading", text: "The blockchain is a linked list" },
        {
          kind: "prose",
          html: `<p>The opening of this page said it. The Bitcoin blockchain is a linked list. Lets prove it with code.</p>
<p>The pointer between nodes is not an address. Its a cryptographic hash. Specifically, the SHA-256 double hash of the previous block header. This single change makes the list unforgeable.</p>
<p>In a regular linked list: change node B, update block A's next pointer. Nobody knows.</p>
<p>In the blockchain: change block B and its hash changes. Block A's prev_hash still holds the old hash. They dont match. Every node on the network detects the tamper. Instantly.</p>
<p>The chain is still a linked list. But the pointer is a content address, not a memory address.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBlockchain },
            c: { language: "c", code: cBlockchain },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the entire blockchain data structure",
          body: `A singly linked list you walk backwards: tip, then its parent, then its parent, all the way to genesis. Inserts happen only at the tip (mining a block). Deletes never happen (it is append-only). The one change from a memory linked list: the <code>next</code> pointer is a SHA-256 hash of the node it points at, not its address. That is what makes it tamper-evident. Change any block and every link after it fails verification, so the whole network rejects the fork. Pointer integrity, enforced by cryptography instead of the OS.`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Linked lists are the gateway to most of the interesting data-structure landscape:</p>
<ul>
  <li><strong>Skip lists</strong>. Probabilistic, sorted, O(log n) operations, the basis of Redis sorted sets and many lock-free maps.</li>
  <li><strong>Persistent / immutable lists</strong>. The cons cell from Lisp, the spine of Haskell, and the structural-sharing trick that makes Clojure's collections work.</li>
  <li><strong>Lock-free linked lists (Harris, Michael &amp; Scott)</strong>. The compare-and-swap algorithms behind <code>java.util.concurrent</code> and Rust's <code>crossbeam</code>.</li>
  <li><strong>Linux's <code>list_head</code></strong>. Read <code>include/linux/list.h</code> for the canonical intrusive-list API; the macros are short and beautiful.</li>
  <li><strong>"Learning Rust With Entirely Too Many Linked Lists"</strong>. The single best resource for understanding why linked lists are hard in Rust, and what to do about it.</li>
</ul>`,
        },
        { kind: "heading", text: "Where linked lists appear in ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>A chain of somewheres shows up everywhere once you know its shape. Here is where the pointer chase reaches across the site.</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            {
              label: "02 / binary",
              value: "8 bytes per next",
              desc: "Every next pointer is 8 bytes of binary, a 64-bit address stored in the node. Linked lists are chains of binary numbers pointing through the heap.",
              href: "/binary",
            },
            {
              label: "01 / number systems",
              value: "Scattered hex addresses",
              desc: "Heap addresses are hex numbers: 0x5591a2b30010 for one node, 0x7f3a0000b020 for the next, scattered across the address space. Hex because binary addresses would be unreadable.",
              href: "/number-systems",
            },
            {
              label: "06 / memory",
              value: "One malloc per node",
              desc: "Every node is a separate heap allocation, one malloc or Box::new each. The memory page warned this costs hundreds of cycles. A five-node list is five trips to the allocator; a Vec pays once.",
              href: "/memory",
            },
            {
              label: "05 / cpu",
              value: "Unprefetchable chases",
              desc: "Walking a list is pointer chases. The CPU cannot prefetch the next node; it learns the address only by reading the current one. Every step is a potential 200-300 cycle cache miss.",
              href: "/cpu",
            },
            {
              label: "07 / operating system",
              value: "Intrusive kernel lists",
              desc: "The kernel uses intrusive doubly linked lists for run queues, wait queues, and timer lists. The same list_head embedded in task_struct connects the structs the OS page described.",
              href: "/operating-system",
            },
            {
              label: "08 / variables",
              value: "Nodes are structs",
              desc: "A node is a struct variable: value plus next: *Node in C, or value plus next: Option<Box<Node>> in Rust. A linked list is those structs scattered across the heap, joined by their pointer fields.",
              href: "/variables",
            },
            {
              label: "09 / pointers",
              value: "Pointers, applied",
              desc: "The next field is a pointer; walking is dereferencing; inserting writes two pointers; deleting writes one. The whole structure is the pointer page made into a chain.",
              href: "/pointers",
            },
            {
              label: "10 / compile vs runtime",
              value: "Rejected at compile time",
              desc: "A doubly linked list is the famous case of Rust refusing code C compiles silently: two mutable references to one node. Rust says no at compile time; C corrupts at runtime.",
              href: "/compile-vs-runtime",
            },
            {
              label: "11 / arrays",
              value: "The opposite",
              desc: "Arrays and linked lists are opposites: contiguous vs scattered, O(1) vs O(n) access, cache-friendly vs cache-hostile. The arrays page is the other side of the fundamental tradeoff.",
              href: "/arrays",
            },
            {
              label: "20 / recursion",
              value: "A recursive structure",
              desc: "A list is either empty or a node followed by a list. The natural traversal is recursive; the safe one is iterative when the list is long. The blockchain is 800,000 nodes deep.",
              href: "/recursion",
            },
            {
              label: "13 / hashing",
              value: "Buckets are chains",
              desc: "Hash maps resolve collisions with linked lists: each bucket is the head of a chain, and colliding keys hang off one array slot. This page is the prerequisite for the next one.",
              href: "/hashing",
            },
            {
              label: "21 / big o",
              value: "Why Big O lies",
              desc: "O(n) access is the price you pay for O(1) inserts: same classification as array iteration, but 5 to 50 times slower. Cache behaviour is not in the notation; linked lists are the proof.",
              href: "/big-o",
            },
            {
              label: "15 / networking",
              value: "sk_buff chains",
              desc: "The Linux kernel often implements socket send and receive buffers as linked lists of sk_buff structs. Each buffer is a node; the packets in flight from the networking page live in them.",
              href: "/networking",
            },
            {
              label: "16 / distributed systems",
              value: "Append-only logs",
              desc: "Event logs are append-only linked lists where each event points to the previous, the same shape as the blockchain. The same tamper-evidence argument applies once the pointer is a hash.",
              href: "/distributed-systems",
            },
            {
              label: "19 / blockchain",
              value: "Hash-linked nodes",
              desc: "The Bitcoin blockchain is a singly linked list whose next pointer is a SHA-256 double hash. Change any block, its hash changes, the next block's pointer no longer matches, the chain breaks.",
              href: "/blockchain",
            },
            {
              label: "22 / sorting",
              value: "Painful to sort",
              desc: "Merge sort works on lists by splitting via pointers, but quicksort needs random access, and the cache cost of any sort is far higher than on an array. The sorting page chose arrays deliberately.",
              href: "/sorting",
            },
          ],
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "pointers",
        text: `A linked list is pointers given a shape. Each node carries a <code>next</code> pointer to the following node. The pointers page is the single idea this whole page is built from.`,
      },
      {
        slug: "arrays",
        text: `The array is this page's rival: contiguous and cache-friendly, but expensive to insert into the middle. Arrays and linked lists are one tradeoff seen from two sides.`,
      },
      {
        slug: "memory",
        text: `Linked-list nodes are scattered across the heap, not lined up like an array. The cache penalty on this page is a memory-layout fact from the memory page.`,
      },
      {
        slug: "nodes",
        text: `A node is the atom of a linked list: a value plus a pointer to the next. The nodes page follows that same word up to networks and blockchains.`,
      },
      {
        slug: "hashing",
        text: `Separate chaining makes each hash bucket the head of a linked list. A chained hash map is literally an array of the lists on this page.`,
      },
      {
        slug: "recursion",
        text: `A linked list is recursive: a node, then a smaller list. Traversing it is naturally recursive. The recursion page is this page expressed as a function.`,
      },
      {
        slug: "big-o",
        text: `Insert at the front is O(1); find by value is O(n). The list trades the array's O(1) indexing for O(1) splicing. The big-o page is where that trade is measured.`,
      },
      {
        slug: "blockchain",
        text: `A blockchain is a linked list whose <code>next</code> pointer is a cryptographic hash of the previous block. The structure on this page is the chain in blockchain.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x0D",
    title: "Turn anything into a fingerprint. Hash maps, Merkle trees, blockchain.",
    href: "/hashing",
    label: "hashing",
    variant: "magenta",
  },
};
