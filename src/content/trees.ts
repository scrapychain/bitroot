import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: a binary tree node and the three recursive traversals.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// A binary tree node.
// Each node owns its children via Box<Node>.
// Box allocates on the heap.
// Option means a child may not exist.
#[derive(Debug)]
struct Node {
    val:   i32,
    left:  Option<Box<Node>>,
    right: Option<Box<Node>>,
}

impl Node {
    fn new(val: i32) -> Box<Self> {
        Box::new(Node { val, left: None, right: None })
    }
}

// Three traversals: all recursive.
// Base case: None (no node here).
// Recursive case: visit left, visit self, visit right.

fn inorder(node: &Option<Box<Node>>) {
    if let Some(n) = node {
        inorder(&n.left);          // go left first
        print!("{} ", n.val);      // visit self
        inorder(&n.right);         // then right
    }
    // base case: None -> do nothing, return
}

fn preorder(node: &Option<Box<Node>>) {
    if let Some(n) = node {
        print!("{} ", n.val);      // visit self first
        preorder(&n.left);
        preorder(&n.right);
    }
}

fn postorder(node: &Option<Box<Node>>) {
    if let Some(n) = node {
        postorder(&n.left);
        postorder(&n.right);
        print!("{} ", n.val);      // visit self last
    }
    // used for: deletion, Merkle root
}

fn main() {
    //      4
    //     / \\
    //    2   6
    //   / \\
    //  1   3
    let mut root = Node::new(4);
    root.left = Some(Node::new(2));
    root.right = Some(Node::new(6));
    root.left.as_mut().unwrap().left  = Some(Node::new(1));
    root.left.as_mut().unwrap().right = Some(Node::new(3));

    inorder(&Some(root));  // prints: 1 2 3 4 6
}`;

const cBeginner = `#include <stdlib.h>
#include <stdio.h>

typedef struct Node {
    int          val;
    struct Node *left;
    struct Node *right;
} Node;

Node *node_new(int val) {
    Node *n = malloc(sizeof *n);
    n->val = val;
    n->left = n->right = NULL;
    return n;
    /* C: you allocate, you free.
     * Rust: Box frees automatically when it goes out of scope.
     * Same heap allocation. Different responsibility. */
}

/* Inorder: left, self, right. */
/* Produces sorted output on a BST. */
void inorder(const Node *n) {
    if (!n) return;          /* base case: NULL = leaf */
    inorder(n->left);
    printf("%d ", n->val);
    inorder(n->right);
}

/* Postorder: left, right, self. */
/* Use this to free a tree (free children before parent). */
/* Use this to compute Merkle roots (hash children first). */
void postorder(const Node *n) {
    if (!n) return;
    postorder(n->left);
    postorder(n->right);
    printf("%d ", n->val);
    /* or: free(n) to delete the tree bottom-up */
}

/* Free a tree: postorder deletion.
 * Free children before freeing parent.
 * Preorder would free parent first: dangling pointers. */
void tree_free(Node *n) {
    if (!n) return;
    tree_free(n->left);
    tree_free(n->right);
    free(n);
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: BST insert, search, delete. Rust threads ownership; C mutates
 * raw pointers and frees by hand.
 * ------------------------------------------------------------------------- */
const rustInter = `// BST insert: maintains the BST property.
// Returns the updated tree (ownership transferred).
fn insert(node: Option<Box<Node>>, val: i32)
    -> Option<Box<Node>>
{
    match node {
        None => Some(Node::new(val)), // found insertion point
        Some(mut n) => {
            if val < n.val {
                n.left = insert(n.left.take(), val);
            } else if val > n.val {
                n.right = insert(n.right.take(), val);
            }
            // equal: BSTs typically ignore duplicates
            Some(n)
        }
    }
    // Rust: ownership threading through recursion.
    // take() moves out of Option, leaving None behind.
    // Ensures no two owners of the same subtree.
}

// BST search: returns reference to node if found.
fn search(node: &Option<Box<Node>>,
          target: i32) -> Option<&Node>
{
    match node {
        None    => None,
        Some(n) => {
            if      target < n.val { search(&n.left,  target) }
            else if target > n.val { search(&n.right, target) }
            else                   { Some(n) }
        }
    }
}

// Using Rust stdlib BTreeMap:
// Self-balancing B-tree. O(log n) all operations.
// Use this in production. Never roll your own.
use std::collections::BTreeMap;

fn index_blocks() {
    let mut index: BTreeMap<u64, Block> = BTreeMap::new();
    index.insert(block_height, block);
    let block = index.get(&height);
    // sorted: index.range(100..200) gives all blocks 100-199
}`;

const cInter = `Node *bst_insert(Node *root, int val) {
    if (!root) return node_new(val); /* insertion point */

    if      (val < root->val) root->left  = bst_insert(root->left,  val);
    else if (val > root->val) root->right = bst_insert(root->right, val);
    /* equal: ignore duplicate */
    return root;
}

Node *bst_search(Node *root, int target) {
    if (!root || root->val == target) return root;
    if (target < root->val) return bst_search(root->left,  target);
    return                         bst_search(root->right, target);
    /* O(log n) average, O(n) on degenerate tree */
}

/* Find the minimum node (leftmost). */
/* Used in BST deletion to find the inorder successor. */
Node *bst_min(Node *n) {
    while (n->left) n = n->left;
    return n;
}

/* BST delete: three cases.
 * 1. Leaf: just free and return NULL.
 * 2. One child: replace with child.
 * 3. Two children: replace with inorder successor. */
Node *bst_delete(Node *root, int val) {
    if (!root) return NULL;
    if (val < root->val) {
        root->left  = bst_delete(root->left,  val);
    } else if (val > root->val) {
        root->right = bst_delete(root->right, val);
    } else {
        if (!root->left)  { Node *r = root->right; free(root); return r; }
        if (!root->right) { Node *l = root->left;  free(root); return l; }
        Node *succ  = bst_min(root->right);
        root->val   = succ->val;
        root->right = bst_delete(root->right, succ->val);
    }
    return root;
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: the Merkle root, exactly as a Bitcoin miner computes it, plus the
 * Merkle proof. Rust uses sha2 + Vec; C uses OpenSSL and an in-place array.
 * ------------------------------------------------------------------------- */
const rustAdv = `use sha2::{Sha256, Digest};

type Hash = [u8; 32];

fn sha256d(data: &[u8]) -> Hash {
    // Bitcoin double-SHA256
    let first  = Sha256::digest(data);
    let second = Sha256::digest(&first);
    second.into()
}

fn sha256d_pair(left: &Hash, right: &Hash) -> Hash {
    let mut combined = [0u8; 64];
    combined[..32].copy_from_slice(left);
    combined[32..].copy_from_slice(right);
    sha256d(&combined)
}

// Compute Merkle root from transaction hashes.
// This is exactly what Bitcoin miners compute
// before placing the Merkle root in the block header.
fn merkle_root(mut hashes: Vec<Hash>) -> Hash {
    assert!(!hashes.is_empty());

    while hashes.len() > 1 {
        // if odd number: duplicate last hash (Bitcoin rule)
        if hashes.len() % 2 == 1 {
            let last = *hashes.last().unwrap();
            hashes.push(last);
        }

        // combine pairs: postorder bottom-up
        hashes = hashes.chunks(2)
            .map(|pair| sha256d_pair(&pair[0], &pair[1]))
            .collect();
        // each iteration halves the number of hashes
        // O(n) total hashing work
        // O(log n) levels
    }
    hashes[0]
    // this 32-byte value appears in every Bitcoin block header
    // as the merkle_root field
    // change any transaction: this value changes
    // the block header hash changes
    // proof of work invalidated
    // network rejects the block
}

// Merkle proof: prove one transaction is in the tree.
// Returns the sibling hashes needed for verification.
fn merkle_proof(tx_index: usize,
                mut hashes: Vec<Hash>) -> Vec<Hash> {
    let mut proof = Vec::new();
    let mut idx   = tx_index;

    while hashes.len() > 1 {
        if hashes.len() % 2 == 1 {
            let last = *hashes.last().unwrap();
            hashes.push(last);
        }
        // sibling: if idx is even, sibling is idx+1
        //          if idx is odd,  sibling is idx-1
        let sibling = if idx % 2 == 0 { idx + 1 } else { idx - 1 };
        proof.push(hashes[sibling]);

        hashes = hashes.chunks(2)
            .map(|pair| sha256d_pair(&pair[0], &pair[1]))
            .collect();
        idx /= 2;
    }
    proof
    // for 4096 transactions: proof has 12 hashes
    // 12 x 32 bytes = 384 bytes
    // vs downloading the full block: ~1 megabyte
    // O(log n) proof size. always.
}`;

const cAdv = `#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <openssl/sha.h>

typedef uint8_t Hash[32];

static void sha256d(const uint8_t *data,
                    size_t len, Hash out) {
    uint8_t first[32];
    SHA256(data, len, first);
    SHA256(first, 32, out);
}

static void sha256d_pair(const Hash left,
                          const Hash right, Hash out) {
    uint8_t combined[64];
    memcpy(combined,      left,  32);
    memcpy(combined + 32, right, 32);
    sha256d(combined, 64, out);
}

/* Compute Merkle root in-place.
 * hashes: array of n transaction hashes.
 * Modifies hashes in place, reducing to 1.
 * Returns the root in hashes[0]. */
void merkle_root(Hash *hashes, size_t *n) {
    while (*n > 1) {
        /* duplicate last if odd */
        if (*n % 2 == 1)
            memcpy(hashes[*n], hashes[*n - 1], 32);

        size_t next = (*n + 1) / 2;
        for (size_t i = 0; i < next; i++)
            sha256d_pair(hashes[2*i],
                         hashes[2*i+1 < *n ? 2*i+1 : 2*i],
                         hashes[i]);
        *n = next;
    }
    /* hashes[0] is now the Merkle root */
    /* same 32 bytes that appear in the Bitcoin block header */
}`;

export const trees: PageContent = {
  slug: "trees",
  hexLabel: "0x1A",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x1A / trees",
    title: `A linked list<br><span class="highlight">that branches.</span>`,
    lede: `Your filesystem is a tree. The HTML in your browser is a tree. Every database index ever built is a tree. The structure that verifies every Bitcoin block is a tree. They are all the same data structure. This page explains why.`,
    narrativeHtml: `<p>You already know a linked list.</p>
<p>Each node has a value. And a pointer to the next node. A chain of somewheres.</p>
<p>A tree is that same idea with one change.</p>
<p><strong>Each node can point to multiple next nodes.</strong></p>
<p>Not one next. Many nexts.</p>
<p>Those multiple next nodes are called <strong>children</strong>. The node above them is the <strong>parent</strong>. The top node with no parent is the <strong>root</strong>. Nodes with no children are <strong>leaves</strong>.</p>
<p>That is the entire data structure. A linked list that branches.</p>
<p>The linked list page was the prerequisite. Recursion was the tool. Hashing was the companion. This page is where all three converge.</p>
<p>And once you understand trees you will find them hiding inside every serious system you have ever used. Your filesystem. Your browser. Your database. Your Bitcoin node.</p>
<p>The same branching shape. Every single time.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "The shape and its **vocabulary**",
      blocks: [
        {
          kind: "prose",
          html: `<p>A tree has five terms you need. Learn them once and you speak the language of every tree algorithm ever written.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "ROOT",
              value: "the top node",
              desc: "Has no parent. Every tree has exactly one root. It is the starting point for every traversal.",
            },
            {
              label: "PARENT / CHILD",
              value: "the relationship",
              desc: "Every node except the root has one parent. Every node can have zero or more children. The relationship goes one direction: down.",
            },
            {
              label: "LEAF",
              value: "no children",
              desc: "A node at the bottom of a branch. Where recursion bottoms out. The base case lives here.",
            },
            {
              label: "HEIGHT",
              value: "root to deepest leaf",
              desc: "The number of edges from the root to the deepest leaf. A single node has height 0. Height is what determines the O(log n) guarantee.",
            },
            {
              label: "SUBTREE",
              value: "a node and its descendants",
              desc: "Any node together with everything below it. The left subtree. The right subtree. Recursive algorithms operate on subtrees.",
            },
            {
              label: "EDGE",
              value: "parent to child",
              desc: "The pointer that joins a parent to one of its children. Follow edges down to traverse. Count edges to measure height.",
            },
          ],
        },
        { kind: "heading", text: "The three traversals" },
        {
          kind: "prose",
          html: `<p>One tree. Three ways to walk it. Each visits the same nodes in a different order, and each order is the right tool for a different job. The sample tree below has its three orders listed underneath.</p>`,
        },
        { kind: "diagram", name: "binary-tree-traversal" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "INORDER",
              value: "left, self, right",
              desc: "1, 2, 3, 4, 5, 6, 7. Visits nodes in sorted order on a BST. Used for sorted output and validation.",
            },
            {
              label: "PREORDER",
              value: "self, left, right",
              desc: "4, 2, 1, 3, 6, 5, 7. Visits the root before its children. Used for copying a tree and serialisation.",
            },
            {
              label: "POSTORDER",
              value: "left, right, self",
              desc: "1, 3, 2, 5, 7, 6, 4. Visits the root after its children. Used for deletion and Merkle root computation.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the Merkle root is postorder",
          body: `The Merkle root is computed postorder. Hash the leaves first. Hash their parents. All the way up. Root last. That is postorder. You met SHA-256 on the hashing page; this is the tree it climbs. Children before parents, every time, which is exactly why the same postorder walk that frees a tree in C also builds a Merkle root in Bitcoin.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "trees.rs" },
            c: { language: "c", code: cBeginner, label: "trees.c" },
          },
        },
        { kind: "widget", name: "bst-visualiser" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "Binary search trees and **balance**",
      blocks: [
        {
          kind: "prose",
          html: `<p>One rule. Everything follows from it.</p>
<p>For every node N:</p>
<ul>
<li>Every value in N's left subtree is less than N's value.</li>
<li>Every value in N's right subtree is greater than N's value.</li>
</ul>
<p><strong>Insert:</strong> compare, go left or right, recurse. <strong>Search:</strong> compare, go left or right, recurse. <strong>Delete:</strong> find, restructure, maintain the property.</p>
<p>All three are O(log n) on a balanced tree. All three are O(n) in the worst case on a degenerate tree. This is binary search from the searching page, except the halving is baked into the structure instead of computed on an array.</p>`,
        },
        { kind: "heading", text: "The degenerate tree" },
        {
          kind: "prose",
          html: `<p>Insert 1, 2, 3, 4, 5 in order. Every value is larger than the last, so every node goes right. The BST becomes a linked list. Search is now O(n), worse than sorting once and binary searching the array.</p>`,
        },
        { kind: "diagram", name: "degenerate-tree" },
        {
          kind: "prose",
          html: `<p>This is why balance matters. A sorted insert sequence destroys a naive BST. The shape that was supposed to give you O(log n) collapses into the exact linked list you started with on page twelve, and you are back to walking every node.</p>`,
        },
        { kind: "heading", text: "Self-balancing trees" },
        {
          kind: "prose",
          html: `<p>A self-balancing tree fixes its own shape after every insert and delete, so it never degenerates.</p>
<p><strong>AVL tree:</strong> the height difference between any two sibling subtrees stays at most 1. Rotation operations restore the balance after each insert or delete. The guarantee is O(log n), always.</p>
<p><strong>Red-black tree:</strong> a more relaxed balance, with fewer rotations. This is the one in production: Rust's <code>BTreeMap</code> relatives, the Linux kernel's <code>rbtree</code>, C++ <code>std::map</code>, Java <code>TreeMap</code>. O(log n) guaranteed, lower rotation overhead.</p>`,
        },
        {
          kind: "table",
          headers: ["Structure", "Insert", "Search", "Delete", "Balance"],
          rows: [
            ["BST", "O(log n)*", "O(log n)*", "O(log n)*", "None"],
            ["AVL", "O(log n)", "O(log n)", "O(log n)", "Strict"],
            ["RB-Tree", "O(log n)", "O(log n)", "O(log n)", "Relaxed"],
            ["B-Tree", "O(log n)", "O(log n)", "O(log n)", "Disk-aware"],
          ],
        },
        {
          kind: "prose",
          html: `<p class="note-line">* amortised. The degenerate case is O(n), which is exactly what a self-balancing tree exists to prevent.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "bst.rs" },
            c: { language: "c", code: cInter, label: "bst.c" },
          },
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// never roll your own in production",
          body: `A hand-written BST is the right thing to learn and the wrong thing to ship. The moment data arrives sorted, and it often does, your tree degenerates to O(n) and takes the system down with it. Reach for the standard library: Rust's BTreeMap, C++ std::map, Java TreeMap. They are self-balancing B-trees and red-black trees that hold O(log n) no matter what order the inserts arrive in.`,
        },
      ],
    },
    /* =================================================================
       LEVEL 03 . ADVANCED
       ================================================================= */
    {
      level: "advanced",
      number: "03",
      title: "Merkle trees, B-trees, and the structures inside **Bitcoin**",
      blocks: [
        { kind: "heading", text: "The Merkle tree" },
        {
          kind: "prose",
          html: `<p>A Merkle tree stores hashes, not values.</p>
<ul>
<li><strong>Leaves:</strong> the SHA-256 hash of each data item.</li>
<li><strong>Internal nodes:</strong> the SHA-256 of their two children concatenated.</li>
<li><strong>Root:</strong> a single 32-byte hash of everything below.</li>
</ul>`,
        },
        { kind: "diagram", name: "merkle-tree" },
        {
          kind: "prose",
          html: `<p>Change Tx B and Hash(B) changes. Then Hash(AB) changes. Then the root changes. The tree is tamper-evident from any leaf all the way to the root.</p>
<p><strong>A Merkle proof.</strong> To prove Tx B is in the tree you provide Hash(A), Hash(CD), and the root. The verifier hashes Tx B, combines it with Hash(A), combines that with Hash(CD), and checks the result against the root. Three hashes. Not four transactions.</p>
<p>For 4096 transactions you need 12 hashes. O(log n) proof size. O(log n) verification. This is how SPV wallets work, and it is why a Bitcoin mobile wallet does not need to download the entire blockchain to verify that a payment landed in a block.</p>
<p>A Merkle tree is a tree where hashing replaces values. Recursion computes the root. O(log n) proofs emerge naturally from the shape.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// three hashes, not four transactions",
          body: `The whole point of the proof is what you do not send. To convince a phone that Tx B is in a block of 4096 transactions, you send 12 sibling hashes, about 384 bytes, instead of the roughly one megabyte of the full block. The phone recomputes the path to the root and compares one 32-byte value. The tree turned a megabyte of trust into 384 bytes of arithmetic.`,
        },
        { kind: "heading", text: "The B-tree" },
        {
          kind: "prose",
          html: `<p>Binary trees have 2 children per node. B-trees have up to thousands. Why? Disk pages.</p>
<p>A disk read loads 4KB or 8KB at a time. Packing hundreds of keys into one node means one disk read loads hundreds of keys. Fewer disk reads per lookup. Much faster for large datasets.</p>
<p>The B-tree properties: all leaves sit at the same depth, each node holds between t and 2t keys for order t, the tree is perfectly balanced at all times, and no rotations are ever needed.</p>`,
        },
        { kind: "diagram", name: "btree-node" },
        {
          kind: "prose",
          html: `<p>This is the structure under PostgreSQL and MySQL, which use page-aligned B+ trees. LevelDB uses an LSM-tree, a log-structured merge-tree cousin, and Bitcoin Core uses LevelDB for both the UTXO set and the block index.</p>
<p>For the UTXO set of roughly 85 million entries, a lookup is O(log 85,000,000), about 26 levels deep. Most of the top levels stay resident in the RAM cache, so an effective lookup touches the disk only 2 or 3 times.</p>
<p>The blockchain page said UTXO lookups are fast. This is why.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "merkle.rs" },
            c: { language: "c", code: cAdv, label: "merkle.c" },
          },
        },
        { kind: "heading", text: "Trees inside Bitcoin: the complete map" },
        {
          kind: "prose",
          html: `<p>Bitcoin runs on three distinct tree structures. All three. Simultaneously. Every block.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "MERKLE TREE",
              value: "in every block header",
              desc: "Every block carries a 32-byte merkle_root: the cryptographic fingerprint of all its transactions, computed postorder. Change one transaction and the root changes, the proof of work is invalidated, and the network rejects the block.",
            },
            {
              label: "B-TREE",
              value: "in LevelDB, on disk",
              desc: "The UTXO set lives in LevelDB, an LSM-tree variant, with 85 million unspent outputs. Every validation does one B-tree lookup per input, O(log n) disk operations. Without it, every validation would be 85 million linear scans.",
            },
            {
              label: "CALL TREE",
              value: "in execution",
              desc: "Validating a block recurses through a call tree: validate_block calls validate_transaction calls verify_input calls verify_script calls execute_opcode. The call stack from the memory page; the recursion from the recursion page; the tree is the execution.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// remove any one tree and Bitcoin stops",
          body: `Remove the Merkle tree and tamper evidence disappears. Remove the B-tree and validation takes years instead of milliseconds. Remove the call tree and the code cannot be written at all. Trees are not one feature of Bitcoin. They are the infrastructure.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where trees appear in ScrapyBytes",
    introHtml: `<p>A tree is a linked list that branches, and that branch shape shows up everywhere once you can see it. Here is where this page reaches back into the rest of the curriculum.</p>`,
    items: [
      {
        slug: "linked-list",
        text: `A tree is a linked list that branches: same heap node, same pointer chasing, same scattered layout. The one next pointer just becomes two or more children. The direct predecessor to this page.`,
      },
      {
        slug: "pointers",
        text: `A tree is pointers that branch. node.left and node.right are pointers, NULL means no child, and following a tree is following pointers in two directions instead of one.`,
      },
      {
        slug: "recursion",
        text: `Tree algorithms are naturally recursive: process the root, recurse left, recurse right, base case NULL. Inorder, preorder and postorder are all recursive, all O(n), and the Merkle root is one postorder walk.`,
      },
      {
        slug: "memory",
        text: `Every tree node is a heap allocation, Box<Node> in Rust, malloc in C, scattered across the heap and joined by pointers. The heap from the memory page is where every tree lives.`,
      },
      {
        slug: "arrays",
        text: `A sorted array is a flattened BST: the midpoint is the root, the halves are the subtrees. Binary search is a BST traversal on an implicit tree, the same O(log n) operation in a different shape.`,
      },
      {
        slug: "searching",
        text: `Binary search on a sorted array is searching a BST. Both are O(log n), both eliminate half per step. The sorted array is just an implicit tree, the searching page seen from the other side.`,
      },
      {
        slug: "sorting",
        text: `A BST gives sorted output for free: inorder traversal visits nodes in order. Tree sort is insert n then traverse, O(n log n) total, the same ceiling as merge sort by a different mechanism.`,
      },
      {
        slug: "binary",
        text: `Every BST comparison is binary: target < node.val go left, target > node.val go right. The sign bit of a subtraction picks the direction. Trees navigate using binary arithmetic.`,
      },
      {
        slug: "hashing",
        text: `A Merkle tree is a tree of hashes, SHA-256 at every node. The hashing page explained SHA-256; this page is the tree structure that makes it tamper-evident at scale. Together they explain Bitcoin block integrity.`,
      },
      {
        slug: "big-o",
        text: `BST search, Merkle proof, B-tree lookup: all O(log n). Trees are the data structure that reaches O(log n) in practice. Big O named the complexity; trees are how you hit it.`,
      },
      {
        slug: "stacks-queues",
        text: `Tree traversal uses both: DFS rides a stack, BFS rides a queue. The traversal you pick decides which structure the tree needs. Stacks and queues are the implementation underneath.`,
      },
      {
        slug: "networking",
        text: `Routing tables are trees. CIDR prefix matching uses a binary trie, a prefix tree, and every IP lookup traverses it. Your packets reach their destination because routers walk trees in nanoseconds.`,
      },
      {
        slug: "distributed-systems",
        text: `Distributed hash tables route through tree-like structures: Chord's finger tables, Kademlia's XOR-distance trees. The distributed systems page showed nodes finding each other; trees are how they do it efficiently.`,
      },
      {
        slug: "blockchain",
        text: `Three trees run inside Bitcoin: a Merkle tree for tamper-evident blocks, a B-tree for fast UTXO lookups in LevelDB, and a call tree for recursive validation. Remove any one and Bitcoin breaks.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1B",
    title: "Data that connects everything: graphs, BFS, DFS, and how the internet finds the shortest path.",
    href: "/graphs",
    label: "graphs",
    variant: "cyan",
  },
};
