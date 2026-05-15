import type { PageContent } from "@/types/content";

const rustHashMapBasic = `use std::collections::HashMap;

fn main() {
    // HashMap<K, V> is Rust's hash map: an array of buckets,
    // indexed by hash(key). Insert and lookup are amortised O(1).
    let mut ages: HashMap<&str, u32> = HashMap::new();

    ages.insert("alice", 27);
    ages.insert("bob",   31);
    ages.insert("carol", 42);

    // Lookup: hash "alice", land in a bucket, return the value.
    // No walking 3 entries comparing names. The hash tells us
    // exactly which bucket to look in.
    if let Some(age) = ages.get("alice") {
        println!("alice is {age}");
    }

    // What the standard library does under the hood:
    //   1. compute hasher.finish() for "alice"            (a u64)
    //   2. reduce it to a bucket index by & (capacity - 1)
    //   3. jump straight to that bucket
    //   4. compare keys (in case of collision) until match or empty
}`;

const cHashMapBasic = `#include <stdio.h>
#include <string.h>
#include <stdint.h>

// A toy fixed-size hash map. Real ones grow and handle collisions
// far more carefully; see the intermediate section.
#define BUCKETS 8

typedef struct {
    const char *key;
    int         value;
    int         used;
} Entry;

// A small, fast (non-cryptographic) string hash: FNV-1a.
uint64_t fnv1a(const char *s) {
    uint64_t h = 0xcbf29ce484222325ULL;
    while (*s) {
        h ^= (uint8_t)*s++;
        h *= 0x100000001b3ULL;
    }
    return h;
}

int main(void) {
    Entry table[BUCKETS] = {0};

    // Insert: hash the key, mod by capacity, drop into that slot.
    const char *k = "alice";
    uint64_t h = fnv1a(k);
    int idx = h & (BUCKETS - 1);   // works because BUCKETS is a power of 2
    table[idx].key   = k;
    table[idx].value = 27;
    table[idx].used  = 1;

    // Lookup: same hash, same index, read the value.
    int q = fnv1a("alice") & (BUCKETS - 1);
    if (table[q].used && strcmp(table[q].key, "alice") == 0)
        printf("alice -> %d\\n", table[q].value);

    return 0;
}`;

const rustChaining = `// A hash map with separate chaining, built by hand.
// Buckets is a Vec; each bucket is a Vec of (key, value) entries.
// This is exactly Vec<LinkedList<(K, V)>> in shape: array + linked-list
// chains from the two previous pages, working together.
struct ChainMap<K, V> {
    buckets: Vec<Vec<(K, V)>>,
}

impl<K: std::hash::Hash + Eq, V> ChainMap<K, V> {
    fn new(cap: usize) -> Self {
        Self { buckets: (0..cap).map(|_| Vec::new()).collect() }
    }

    fn bucket_for(&self, key: &K) -> usize {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        key.hash(&mut h);
        (h.finish() as usize) % self.buckets.len()
    }

    fn insert(&mut self, key: K, value: V) {
        let i = self.bucket_for(&key);
        let bucket = &mut self.buckets[i];
        // Update if key already present, otherwise push.
        for (k, v) in bucket.iter_mut() {
            if *k == key { *v = value; return; }
        }
        bucket.push((key, value));
    }

    fn get(&self, key: &K) -> Option<&V> {
        let i = self.bucket_for(key);
        self.buckets[i].iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }
}`;

const cChaining = `#include <stdlib.h>
#include <string.h>
#include <stdint.h>

// Same idea in C: array of bucket-heads, each one a singly linked list.
typedef struct Entry {
    char         *key;
    int           value;
    struct Entry *next;       // chain pointer, the linked-list page
} Entry;

#define BUCKETS 256
static Entry *table[BUCKETS] = {0};

uint64_t fnv1a(const char *s);   // from the previous snippet

void put(const char *key, int value) {
    uint64_t h = fnv1a(key) & (BUCKETS - 1);

    // Walk the chain in case the key already exists.
    for (Entry *e = table[h]; e; e = e->next) {
        if (strcmp(e->key, key) == 0) { e->value = value; return; }
    }

    // New entry: prepend to the bucket's chain (O(1)).
    Entry *e = malloc(sizeof *e);
    e->key   = strdup(key);
    e->value = value;
    e->next  = table[h];
    table[h] = e;
}`;

const rustOpenAddressing = `// Open addressing: NO linked lists. When a bucket is taken, probe the
// next slot. Modern hash maps (Swiss tables, Rust's std HashMap,
// Google's Abseil) use this. Cache-friendly because everything stays
// in one contiguous Vec, exactly what the memory page would approve of.
struct OpenMap<K, V> {
    buckets: Vec<Option<(K, V)>>,
}

impl<K: std::hash::Hash + Eq + Clone, V: Clone> OpenMap<K, V> {
    fn insert(&mut self, key: K, value: V) {
        let cap = self.buckets.len();
        let mut i = self.hash(&key) % cap;
        loop {
            match &self.buckets[i] {
                None => { self.buckets[i] = Some((key, value)); return; }
                Some((k, _)) if *k == key => {
                    self.buckets[i] = Some((key, value));
                    return;
                }
                _ => i = (i + 1) % cap, // linear probe to the next slot
            }
        }
    }

    fn hash(&self, key: &K) -> usize {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        key.hash(&mut h);
        h.finish() as usize
    }
}

// Why this beats chaining on real machines:
//   - one contiguous array → every probe step hits prefetched cache lines
//   - no per-entry allocation, no pointer chases
//   - the linked-list page's cache penalty applies to chaining, not here`;

const rustCryptoHash = `// Cryptographic hashes are like map hashes, but stronger.
//
// Properties HashMap doesn't need but blockchains do:
//   1. Pre-image resistance: given H(x), can't find x.
//   2. Collision resistance: can't find x, y with H(x) == H(y).
//   3. Avalanche: flip one bit of x → ~half the bits of H(x) flip.
//
// The price is speed: SHA-256 takes ~10 ns per byte; FNV-1a takes
// fractions of a nanosecond. You'd never use SHA-256 in a HashMap.
use sha2::{Sha256, Digest};

fn main() {
    let block_data = b"prev_hash || merkle_root || nonce=42";
    let mut hasher = Sha256::new();
    hasher.update(block_data);
    let digest = hasher.finalize();

    // 32 bytes (256 bits) regardless of input length.
    println!("{:x}", digest);

    // Bitcoin block-mining loop, in 4 lines:
    //   for nonce in 0.. {
    //       let h = sha256(block_with(nonce));
    //       if h.starts_with_zero_bits(target) { break }
    //   }
}`;

const rustMerkleRoot = `// A tiny Merkle root, in 20 lines.
// Each leaf is hashed. Pairs of hashes are concatenated and hashed.
// Repeat until one hash remains: the root.
use sha2::{Sha256, Digest};

fn h(bytes: &[u8]) -> Vec<u8> {
    Sha256::digest(bytes).to_vec()
}

fn merkle_root(leaves: &[&[u8]]) -> Vec<u8> {
    // Hash all leaves.
    let mut layer: Vec<Vec<u8>> = leaves.iter().map(|l| h(l)).collect();

    // Combine pairs until only the root is left.
    while layer.len() > 1 {
        let mut next = Vec::with_capacity(layer.len() / 2 + 1);
        for pair in layer.chunks(2) {
            let mut combined = pair[0].clone();
            // If odd number of nodes, duplicate the last one (Bitcoin's rule).
            combined.extend_from_slice(pair.get(1).unwrap_or(&pair[0]));
            next.push(h(&combined));
        }
        layer = next;
    }
    layer.pop().unwrap()
}

// Change any leaf, even by one bit, and the root changes completely.
// That single 32-byte root is enough to prove the integrity of
// gigabytes of transactions underneath it.`;

export const hashing: PageContent = {
  slug: "hashing",
  hexLabel: "0x0D",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x0D / structure",
    title: `A fingerprint for<br><span class="highlight">anything.</span>`,
    lede: `A <strong>hash function</strong> turns arbitrary input (a string, a file, a struct, a gigabyte of transactions) into a small, fixed-size number. From that one idea you get hash maps (the workhorse of every dynamic language), content-addressed storage, password hashing, Merkle trees, and the chain in blockchain. Every layer is the same trick, just applied with more or less paranoia.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Hashing as a **fingerprint function**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Imagine a librarian with a peculiar talent. You hand them any book (a thin pamphlet, a thousand-page novel, a comic) and within a second they hand back a five-digit number. The same book always gets the same number. Different books almost always get different numbers. The number tells you nothing about the book itself, and you can't reconstruct the book from the number. That number is a <strong>hash</strong>, and the librarian is a <strong>hash function</strong>.</p>
<p>A hash function:</p>
<ul>
  <li>Takes input of <strong>arbitrary size</strong>: bytes are bytes.</li>
  <li>Returns a <strong>fixed-size number</strong>: 32, 64, or 256 bits, depending on the function.</li>
  <li>Is <strong>deterministic</strong>: same input → same output, every time, on every machine.</li>
  <li>Spreads inputs <strong>uniformly</strong>: similar inputs get wildly different outputs.</li>
  <li>Is <strong>one-way</strong>: cheap to compute forward, useless to run in reverse.</li>
</ul>`,
        },
        { kind: "heading", text: "A picture of a hash function" },
        { kind: "diagram", name: "hash-function" },
        {
          kind: "prose",
          html: `<p>Notice the third row: <code>"alicf"</code> differs from <code>"alice"</code> by a single character, but the output is completely different. This is the <strong>avalanche property</strong>: flip one input bit and roughly half the output bits flip. It's what makes hashes useful for both lookup tables and tamper detection.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the arrays page",
          body: `A hash map starts with the array from the arrays page: a contiguous block of <em>buckets</em>, addressable by index. Hashing is the trick that turns a key like <code>"alice"</code> into a bucket index. From there it's the same O(1) indexed access an array always gave you.`,
        },
        { kind: "heading", text: "A hash map: hash → index → array slot" },
        { kind: "diagram", name: "hash-table-basic" },
        {
          kind: "prose",
          html: `<p>This is the whole magic, in one picture. To store the pair <code>("alice", 27)</code>:</p>
<ol>
  <li>Compute <code>hash("alice")</code>: say it returns the 64-bit number <code>0x5d1a8b…</code>.</li>
  <li>Reduce it to a bucket index with <code>hash % capacity</code>, which here gives 3.</li>
  <li>Write <code>("alice", 27)</code> into <code>buckets[3]</code>.</li>
</ol>
<p>To look it up again, you do the same thing: hash <code>"alice"</code>, get the same 3, read <code>buckets[3]</code>. No walking. No searching. The lookup time doesn't depend on how many keys are stored.</p>`,
        },
        { kind: "heading", text: "Build one in Rust and C" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustHashMapBasic },
            c: { language: "c", code: cHashMapBasic },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// hash maps are everywhere, even when they're invisible",
          body: `Python <code>dict</code>, JavaScript objects and <code>Map</code>, Go <code>map[K]V</code>, Rust <code>HashMap</code>, Java <code>HashMap</code>, C# <code>Dictionary</code>, Lua tables, Redis itself: all hash maps under the hood. Every time you write <code>obj.foo</code> in JavaScript or <code>d["key"]</code> in Python, you're doing the diagram above. The "key" gets hashed, the hash points at a slot, and the value gets read in constant time.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "**Collisions**, chaining, and the load factor",
      blocks: [
        {
          kind: "prose",
          html: `<p>The beginner picture has a hole in it. If <code>buckets</code> has 8 slots and you insert 100 keys, the pigeonhole principle says at least one bucket has to hold more than one key. Two distinct keys whose hashes land in the same bucket is called a <strong>collision</strong>, and every real hash map needs a strategy for handling them.</p>`,
        },
        { kind: "heading", text: "Strategy 1: Separate chaining" },
        {
          kind: "prose",
          html: `<p>Each bucket isn't a single slot; it's a <em>list</em> of entries. To insert, you hash, find the bucket, walk the list, append (or update if the key already exists). To look up, you hash, find the bucket, walk the list comparing keys.</p>`,
        },
        { kind: "diagram", name: "hash-collision-chain" },
        {
          kind: "prose",
          html: `<p>This is where the previous two pages pay off. A chained hash map is literally an <strong>array of linked lists</strong>. The arrays page gives you O(1) bucket lookup. The linked-list page gives you O(1) splicing of new entries into a bucket. Both data structures, both doing what they're best at, side by side.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the linked-list page",
          body: `The chain at <code>buckets[3]</code> is a singly linked list, the same shape as the diagram on the linked-list page. The good news: chains are usually <em>tiny</em>. With a sensible load factor (next section), the average chain length is well under 2. The bad news: each chain node is a separate heap allocation, with all the cache penalty the linked-list page warned about. That's why modern implementations prefer open addressing.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustChaining },
            c: { language: "c", code: cChaining },
          },
        },
        { kind: "heading", text: "Strategy 2: Open addressing" },
        {
          kind: "prose",
          html: `<p>The alternative: no linked lists at all. The bucket array <em>is</em> the storage. When a bucket is taken, <em>probe</em> the next one, then the next, until you find an empty slot. To look up a key, hash to the start position and walk forward (using the same probe pattern) until you find the key, or hit an empty slot, or wrap around.</p>
<p>This is the strategy used by Rust's <code>std::collections::HashMap</code>, Google's Abseil (<code>SwissTable</code>), Python <code>dict</code> (since 3.6), and most other modern implementations. Why? <strong>Cache locality</strong>. Everything lives in one contiguous <code>Vec</code>. The CPU's cache prefetcher loves it. The linked-list version, with its scattered heap allocations, doesn't.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustOpenAddressing },
            c: { language: "c", code: rustOpenAddressing },
          },
        },
        { kind: "heading", text: "Chaining vs open addressing, in one table" },
        {
          kind: "table",
          headers: ["", "chaining", "open addressing"],
          rows: [
            [
              "<strong>collision handling</strong>",
              "linked list per bucket",
              "probe the next slot",
            ],
            [
              "<strong>memory layout</strong>",
              "array of buckets + heap-allocated chains",
              "one contiguous array",
            ],
            [
              "<strong>cache friendliness</strong>",
              "poor: pointer chases through the heap",
              "excellent: every probe hits prefetched cache lines",
            ],
            [
              "<strong>delete</strong>",
              "easy: unlink the node",
              "trickier: tombstones, or shift entries back",
            ],
            [
              "<strong>used by</strong>",
              "Java <code>HashMap</code>, classic textbooks",
              "Rust, Python 3.6+, Swiss tables, Abseil",
            ],
          ],
        },
        { kind: "heading", text: "The load factor and resizing" },
        {
          kind: "prose",
          html: `<p>How full a hash map is matters enormously. The <strong>load factor</strong> is <code>num_entries / num_buckets</code>. As it rises, collisions get more frequent, and the "constant-time" lookup gets slower. As it falls, you waste memory.</p>
<p>The standard trick: once the load factor passes some threshold (typically 0.7 to 0.9), <strong>resize</strong>. Allocate a new bucket array, usually twice as big, and re-hash every entry into it. The resize is O(n), but it happens rarely enough that the average insert is still amortised O(1), exactly the same argument as <code>Vec::push</code> from the arrays page.</p>`,
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the worst case is still O(n)",
          body: `If an attacker can choose keys that all hash to the same bucket, your O(1) hash map degrades to an O(n) linked-list walk. This isn't theoretical: "hash flooding" was a real DoS vector in PHP, Java, and others. Modern languages defend against it by <strong>randomly seeding</strong> their hash functions at process start (<code>SipHash</code> in Rust, Python, etc.). The hash is unpredictable across runs, so an attacker can't precompute a collision set.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "**Cryptographic hashes**, Merkle trees, and the blockchain",
      blocks: [
        { kind: "heading", text: "When 'good enough' isn't enough" },
        {
          kind: "prose",
          html: `<p>The hash functions inside <code>HashMap</code> (FNV-1a, SipHash, fxhash, wyhash) are <strong>fast</strong>. A few nanoseconds per key. They have to be; you'd never use one of them if it cost a microsecond. They distribute keys well, they're hard for an attacker to flood, and that's where their job ends.</p>
<p><strong>Cryptographic hashes</strong> (SHA-256, BLAKE3, Keccak) are a different beast. They're slower (10s of nanoseconds per byte, not per key) and they add three more properties:</p>
<ul>
  <li><strong>Pre-image resistance</strong>: given a hash <code>h</code>, you cannot find an input <code>x</code> such that <code>hash(x) = h</code>. (Better than that: you cannot find one in less than ~2<sup>256</sup> attempts.)</li>
  <li><strong>Collision resistance</strong>: you cannot find two distinct inputs that produce the same hash, in any reasonable amount of compute.</li>
  <li><strong>Avalanche</strong>: change one bit of input, roughly half the bits of the output flip, chaotically and unpredictably.</li>
</ul>
<p>These three properties turn the hash into something stronger than an index. They turn it into an <strong>identity</strong>.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustCryptoHash },
            c: { language: "rust", code: rustCryptoHash },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// content-addressed storage",
          body: `Git, IPFS, Docker image layers, Nix package store: every one of these stores its objects under the hash of their contents. Two files with the same contents have the same hash, which means they're <em>literally the same file</em> in the store. Tampering with a file changes its hash, which means tampering is instantly detectable. The whole architecture rests on one assumption: nobody can find two inputs with the same hash. So far, for SHA-256, nobody has.`,
        },
        { kind: "heading", text: "Merkle trees: hashing, but recursive" },
        {
          kind: "prose",
          html: `<p>You have a million transactions. You want a single 32-byte fingerprint that proves none of them have been tampered with, and you want it to be efficient to verify any one transaction's membership in the set without re-hashing the whole million.</p>
<p>The Merkle tree solves this. Hash each transaction. Pair the leaf hashes and hash those pairs. Repeat until one hash is left: the <strong>Merkle root</strong>.</p>`,
        },
        { kind: "diagram", name: "merkle-tree" },
        {
          kind: "prose",
          html: `<p>The root is a 32-byte fingerprint of the entire tree. Two superpowers fall out of this structure:</p>
<ul>
  <li>If <em>any</em> leaf changes (flip a single bit on <code>tx2</code>), every hash on the path from that leaf to the root changes. The root becomes unrecognisable.</li>
  <li>To prove <code>tx2</code> is part of the tree, you don't need the other million transactions. You need <code>H(tx1)</code>, the sibling hash one level up, and the sibling hash above that. That's <code>O(log n)</code> hashes: a few dozen, even for trees of billions of leaves. This is the <strong>Merkle proof</strong>, and it's how light wallets, Certificate Transparency, BitTorrent, and Git all prove inclusion cheaply.</li>
</ul>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMerkleRoot },
            c: { language: "rust", code: rustMerkleRoot },
          },
        },
        { kind: "heading", text: "The chain in blockchain" },
        {
          kind: "prose",
          html: `<p>A blockchain is a <strong>hash-linked list</strong>. Take the linked-list page, replace the <code>next</code> pointer with a cryptographic hash of the previous block's contents, and you have it.</p>`,
        },
        { kind: "diagram", name: "block-chain" },
        {
          kind: "prose",
          html: `<p>Every block contains, among other things:</p>
<ul>
  <li>A <strong>prev-hash</strong>: the SHA-256 of the previous block's header.</li>
  <li>A <strong>Merkle root</strong>: a fingerprint of every transaction in this block.</li>
  <li>A <strong>nonce</strong>: a number whose only purpose is to make the block's own hash come out a certain way.</li>
</ul>
<p>Tamper with any historical transaction → its leaf hash changes → the Merkle root of its block changes → that block's overall hash changes → the <em>next</em> block's prev-hash no longer matches → the chain breaks. And it breaks not just here but for every block after the tampered one. Re-faking that requires re-mining every subsequent block, faster than the rest of the network is mining new ones. That's the security argument, in one sentence.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// proof-of-work, in one paragraph",
          body: `Bitcoin's mining is just: keep trying nonces until <code>sha256(block_header)</code> starts with enough zero bits. Because SHA-256 has the avalanche property, the output is effectively random, and the probability of a random 256-bit number starting with <em>N</em> zero bits is <code>1/2<sup>N</sup></code>. So finding a valid block takes ~2<sup>N</sup> hash attempts on average. <em>That's</em> the work in "proof of work". The hash function does all the heavy lifting; everything else is just a knob to dial the difficulty.`,
        },
        { kind: "heading", text: "Where hashing actually lives in your stack" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "every dynamic language",
              value: "dict / object / map",
              desc: "Python <code>dict</code>, JavaScript object property access, Ruby Hash, Lua tables, Go maps. Every <code>obj.foo</code> or <code>d[key]</code> is a hash + bucket lookup. Hash maps are the most-used data structure in software, by a wide margin.",
            },
            {
              label: "content-addressed systems",
              value: "Git, IPFS, Docker, Nix",
              desc: "Every Git commit, file, and tree is stored by its SHA-1 (now SHA-256) hash. Docker image layers, IPFS objects, Nix store paths: same pattern. The address <em>is</em> the contents' fingerprint, so deduplication, integrity, and synchronisation all fall out of the same primitive.",
            },
            {
              label: "blockchains and crypto",
              value: "Bitcoin, Ethereum, signatures",
              desc: "Block headers, Merkle roots, transaction IDs, addresses, proof-of-work, proof-of-stake: every layer of every blockchain is layered hash functions. Digital signatures hash the message before signing it; certificate transparency hashes certs into Merkle trees; ZK proofs hash everything in sight.",
            },
            {
              label: "system internals",
              value: "Bloom filters, dedup, caches",
              desc: "Bloom filters (probabilistic set membership) in databases and CDNs. Block-level dedup in filesystems like ZFS and Btrfs. Cache keys in browsers and CDNs. Password storage (bcrypt, scrypt, Argon2, all built on cryptographic hashes). Even <code>rsync</code> uses hashes to detect changed file ranges.",
            },
          ],
        },
        { kind: "heading", text: "The connection back to the whole site" },
        {
          kind: "prose",
          html: `<p>Step back and the picture is clean. A hash map is an <strong>array</strong> of <strong>linked lists</strong>, with a <strong>function</strong> for picking the right slot. Cryptographic hashes are the same function, slower and harder. A Merkle tree is that function applied recursively. A blockchain is a Merkle-rooted linked list with hashes for next-pointers, secured by a brute-force search the CPU page would recognise as embarrassingly parallel work.</p>
<p>Every layer is the same trick, applied with more or less paranoia, against different threat models. From the home-page topic cards' bottom row up: pointers became linked lists became hash maps; arrays plus linked lists plus hashes became the architecture of every database, every package manager, every cryptocurrency. The pieces don't change. They just stack.</p>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Hashing is the topic with the longest tail of follow-ons. If any of these caught your eye:</p>
<ul>
  <li><strong>SipHash, wyhash, BLAKE3</strong>. The cutting edge of fast, attack-resistant non-cryptographic and cryptographic hashes respectively.</li>
  <li><strong>Bloom filters and cuckoo filters</strong>. Probabilistic set membership in a fraction of the memory of a hash map. The basis of every "have I seen this before?" check at scale.</li>
  <li><strong>Consistent hashing</strong>. The trick that lets distributed systems (Cassandra, DynamoDB, memcached clusters) reshard when nodes come and go, without remapping every key.</li>
  <li><strong>Distributed hash tables</strong>. Kademlia, BitTorrent's mainline DHT, Chord. How peer-to-peer networks find each other without a central index.</li>
  <li><strong>Zero-knowledge proofs (SNARKs, STARKs)</strong>. Cryptographic hashes are at the core of every modern zk system: Merkle trees of computation traces, hashed into proofs you can verify in milliseconds.</li>
  <li><strong>Robin Hood and Hopscotch hashing</strong>. Open-addressing variants that bound the worst-case probe distance, used in some of the fastest production hash maps.</li>
</ul>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x0E",
    title: "One word, three scales. What 'node' means in data structures, networking, and blockchain.",
    href: "/nodes",
    label: "nodes",
    variant: "cyan",
  },
};
