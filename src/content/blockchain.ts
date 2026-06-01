import type { PageContent } from "@/types/content";

const rustBlockStruct = `// A Bitcoin block, in 30 lines.
// Hash this struct, get a 32-byte fingerprint; that's the block's identity.
// The next block in the chain stores this fingerprint as its prev_hash.
use sha2::{Sha256, Digest};

struct BlockHeader {
    version:        u32,        // 4 bytes
    prev_hash:      [u8; 32],   // 32 bytes; points at the previous block
    merkle_root:    [u8; 32],   // 32 bytes; fingerprint of every tx in this block
    timestamp:      u32,        // 4 bytes;  unix time
    bits:           u32,        // 4 bytes;  encodes the current difficulty target
    nonce:          u32,        // 4 bytes;  the miner's degree of freedom
}                               // = 80 bytes total

impl BlockHeader {
    fn hash(&self) -> [u8; 32] {
        // Bitcoin double-hashes: SHA-256(SHA-256(header)).
        // The double is for historical reasons; the result is still 32 bytes.
        let mut h1 = Sha256::new();
        h1.update(self.serialize());
        let first = h1.finalize();

        let mut h2 = Sha256::new();
        h2.update(first);
        h2.finalize().into()
    }
}`;

const rustMiningLoop = `// The mining loop in five lines, conceptually.
// Increment the nonce, hash, check. Repeat ~2^70 times per block on Bitcoin.
fn mine(mut header: BlockHeader, target: [u8; 32]) -> BlockHeader {
    loop {
        let h = header.hash();
        if h < target {       // hash interpreted as a 256-bit big-endian number
            return header;    // we found a valid block
        }
        header.nonce = header.nonce.wrapping_add(1);
        // if nonce overflows, miners tweak the coinbase tx to refresh the
        // merkle_root, which gives them another 2^32 attempts. In practice
        // they also vary the timestamp by a few seconds.
    }
}

// Every Bitcoin block on the planet was found by some computer running
// this exact loop. The thing that took thousands of CPU-years of compute
// is the IF check on line 4. There is no clever algorithm; only the loop.`;

const rustTxLifecycle = `// A Bitcoin transaction in flight. This is the same byte stream that travels
// from your wallet through the gossip network to the miners.
//
// Step-by-step, every layer of the site is doing its job:
//
//   1. WALLET CREATES TX
//      - allocates a Vec<u8> on the heap   (memory + arrays pages)
//      - fills it with inputs, outputs, scripts
//
//   2. WALLET SIGNS TX
//      - hashes the tx body with SHA-256   (hashing page)
//      - signs that hash with ECDSA / Schnorr
//
//   3. WALLET BROADCASTS TX
//      - opens a TCP socket to a Bitcoin node    (pointers + OS + networking pages)
//      - writes the serialised tx as bytes       (binary page; bytes are bytes)
//      - kernel splits it into IP packets         (networking page)
//
//   4. NODES VALIDATE TX
//      - parse the bytes back into a struct      (variables + arrays page)
//      - verify the signature with hashing       (hashing page)
//      - check inputs against the UTXO set       (hash maps; hashing page)
//      - if valid, gossip it to every peer       (networking page)
//
//   5. MINER INCLUDES TX IN A BLOCK
//      - the mempool is a hash map keyed by txid (hashing page)
//      - the miner picks high-fee txs into a candidate block
//      - hashes the block header repeatedly until a valid nonce is found
//
//   6. BLOCK GOSSIPED ACROSS THE NETWORK
//      - every node verifies the block independently
//      - if everything checks out, the block is added to the chain
//      - your tx now has one "confirmation"
//
// Every layer in here was a previous page on this site.`;

const cByteOnTheWire = `#include <stdint.h>

// What's on the wire between two Bitcoin nodes. Every \`bitcoind\` and
// \`btcd\` on the planet sends and receives exactly this:
struct BitcoinMessage {
    uint32_t magic;          // 0xD9B4BEF9 for mainnet
    char     command[12];    // "tx", "block", "inv", "version", ...
    uint32_t payload_size;
    uint32_t checksum;       // first 4 bytes of SHA-256(SHA-256(payload))
    uint8_t  payload[];      // the actual transaction or block bytes
};

// The payload is itself a binary-encoded struct: integers little-endian,
// strings length-prefixed, hashes raw 32-byte blobs. Same idea as every
// protocol in the networking page. The agreement is what makes it work.
//
// Strip the message wrapper: bytes.
// Strip the bytes: bits.
// Strip the bits: voltages on copper, photons on glass.
// All the way down to the transistor.`;

const cBlockStruct = `#include <stdint.h>
#include <string.h>
#include <openssl/sha.h>

/* A Bitcoin block header: exactly 80 bytes. */
typedef struct __attribute__((packed)) {
    uint32_t version;           /* 4 bytes */
    uint8_t  prev_hash[32];     /* 32 bytes; points at previous block */
    uint8_t  merkle_root[32];   /* 32 bytes; fingerprint of all txns */
    uint32_t timestamp;         /* 4 bytes;  unix time */
    uint32_t bits;              /* 4 bytes;  encodes difficulty target */
    uint32_t nonce;             /* 4 bytes;  the miner's degree of freedom */
} BlockHeader;                  /* = 80 bytes total */

/* Bitcoin double-hashes: SHA256(SHA256(header)). */
void block_hash(const BlockHeader *header, uint8_t out[32]) {
    uint8_t first[32];
    SHA256((const uint8_t *)header, sizeof(BlockHeader), first);
    SHA256(first, 32, out);
}

/* Compare hash against target (both big-endian 256-bit). */
int hash_meets_target(const uint8_t hash[32], const uint8_t target[32]) {
    return memcmp(hash, target, 32) < 0;
}`;

const cMiningLoop = `#include <stdint.h>
#include <string.h>

/* The mining loop. Every Bitcoin block ever found was
 * produced by some version of this loop. */
BlockHeader mine(BlockHeader header, const uint8_t target[32]) {
    uint8_t hash[32];

    for (;;) {
        block_hash(&header, hash);

        /* Hash interpreted as a 256-bit big-endian number.
         * If it is less than the target: valid block found. */
        if (hash_meets_target(hash, target)) {
            return header;
        }

        header.nonce++; /* try the next nonce */

        /* nonce overflows every 2^32 attempts (~4 billion).
         * Miners then tweak the coinbase tx to get a new
         * merkle_root, giving them another 2^32 attempts.
         * In practice they also vary the timestamp. */
        if (header.nonce == 0) {
            break; /* signal: need to refresh merkle_root */
        }
    }
    return header; /* caller updates merkle_root and retries */
}

/* Every Bitcoin block on the planet was found by some
 * computer running this exact loop. The expensive part is
 * the hash_meets_target check. No clever algorithm. Only the loop. */`;

const cTxLifecycle = `#include <stdint.h>
#include <string.h>
#include <unistd.h>

/*
 * A Bitcoin transaction in flight. The same byte stream that
 * travels from your wallet through the gossip network to the
 * miners. Each step uses a different page from this site.
 */

/* STEP 1: WALLET CREATES TX
 *   - allocates memory on the heap        (memory page)
 *   - fills with inputs, outputs, scripts */
typedef struct {
    uint8_t  *data;     /* heap-allocated byte array (arrays page) */
    uint32_t  length;
    uint32_t  capacity;
} ByteVec;

/* STEP 2: WALLET SIGNS TX
 *   - hashes the tx body with SHA-256     (hashing page)
 *   - signs the hash with ECDSA / Schnorr */
void sign_transaction(ByteVec *tx, const uint8_t privkey[32],
                      uint8_t sig_out[64]) {
    uint8_t tx_hash[32];
    SHA256(tx->data, tx->length, tx_hash); /* hashing page */
    ecdsa_sign(privkey, tx_hash, sig_out); /* cryptography */
}

/* STEP 3: WALLET BROADCASTS TX
 *   - opens a TCP socket to a node   (OS + networking pages)
 *   - writes serialised tx as bytes  (binary page)
 *   - kernel splits into IP packets  (networking page) */
int broadcast_transaction(const ByteVec *tx, const char *node_ip,
                          uint16_t port) {
    int sock = tcp_connect(node_ip, port); /* OS + pointers */
    if (sock < 0) return -1;

    struct BitcoinMessage msg = {
        .magic        = 0xD9B4BEF9,
        .payload_size = tx->length,
    };
    memcpy(msg.command, "tx\\0\\0\\0\\0\\0\\0\\0\\0\\0\\0", 12);
    SHA256d(tx->data, tx->length, msg.checksum); /* hashing page */

    write(sock, &msg, sizeof(msg));              /* networking page */
    write(sock, tx->data, tx->length);
    return sock;
}

/* STEP 4: NODES VALIDATE TX
 *   - parse bytes back into a struct   (variables + arrays page)
 *   - verify signature via hashing     (hashing page)
 *   - check the UTXO set (a hash map)  (hashing page)
 *   - gossip to peers if valid         (networking page)
 *
 * STEP 5: MINER INCLUDES IT IN A BLOCK
 *   - mempool is a hash map txid->tx   (hashing page)
 *   - mines the header until valid     (this page)
 *
 * STEP 6: BLOCK GOSSIPED AND CONFIRMED
 *   - every node verifies independently
 *   - your tx now has one confirmation
 *
 * Every layer in here was a previous page on this site. */`;

export const blockchain: PageContent = {
  slug: "blockchain",
  hexLabel: "0x13",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x13 / system",
    title: `From one switch<br><span class="highlight">to a financial network nobody owns.</span>`,
    lede: `Bell Labs, 1947. A small piece of germanium let electricity change direction on command. Two states, one switch. In 2008, nine pages by Satoshi Nakamoto turned that same primitive, scaled by billions, into a network that lets thousands of strangers agree on a shared truth without trusting each other. This page is the bridge between those two events. It's the capstone: every other page on the site shows up here, in order, with nothing missing.`,
    narrativeHtml: `<p>Seventy seven years ago, a physicist made electricity change direction on command.</p>
<p>He pressed two thin wires into a sliver of germanium, watched a current flip, and wrote a modest little note about a better amplifier.</p>
<p>He thought he had improved the radio.</p>
<p>He had actually started all of this.</p>
<p>One switch. Two states. On or off. The entire tower youve spent this curriculum climbing rests on that one afternoon in a lab.</p>
<p>And today that exact switch, copied billions of times onto chips smaller than your fingernail, runs a network that no government owns, no company controls, and no army can switch off.</p>
<p>How do you get from one to the other?</p>
<p>You climb. One page at a time. And youve already done the climbing.</p>
<p>Two states became binary, page two. Binary became logic gates, page four. Gates became a CPU, page five. The CPU got memory, an operating system, variables, pointers. You learned to fold any input into a fingerprint. You learned how machines talk, and how thousands of strangers agree without trusting a soul.</p>
<p>Every one of those pages was a rung.</p>
<p>This is the top of the ladder.</p>
<p>A blockchain isnt a new idea. Its every old idea, stacked in exactly the right order, until something appears that none of them could do alone.</p>
<p>The transistor never knew it would become money.</p>
<p>The pages behind you never knew theyd become this.</p>
<p>Lets put them all together.</p>
<p>One last climb.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The **ladder**: from a transistor to Bitcoin",
      blocks: [
        {
          kind: "prose",
          html: `<p>In 1947 a physicist at Bell Labs placed two gold foil contacts onto a sliver of germanium. He applied a small voltage. And made electricity change direction. He called it a transistor. He had no idea what he had started.</p>
<p>Sixty one years later a person called Satoshi Nakamoto published nine pages. Those nine pages took the same switch, scaled by billions, running at four billion cycles per second, connected to every other machine on Earth, and answered a question that had been considered unsolvable for thirty years: how do thousands of strangers agree on the same truth without trusting each other?</p>
<p>Not with a central server. Not with a trusted third party. Not with anyone in charge. With mathematics.</p>
<p>This page is the bridge between those two moments. Every page on this site shows up here. In order. With nothing missing.</p>`,
        },
        {
          kind: "prose",
          html: `<p>You have already met every layer below. This page stacks them, deliberately, on top of each other, and shows what falls out at the top. The stack is not metaphorical. Every box in the ladder below is a real, physical layer that the layer above it depends on.</p>`,
        },
        { kind: "diagram", name: "computing-stack-ladder" },
        {
          kind: "prose",
          html: `<p>Read the ladder bottom to top, the way history built it:</p>
<ul>
  <li><strong>Transistor (1947).</strong> Bell Labs, William Shockley, John Bardeen, Walter Brattain. A pinch of germanium that switches electricity on or off in response to a third terminal. Single switch. The Nobel was for this.</li>
  <li><strong>Binary.</strong> Two voltage levels become two symbols: 0 and 1. Every other number, every character, every image, every video, every bitcoin transaction is, at the wire level, a sequence of these. The binary page covered it.</li>
  <li><strong>Logic gates.</strong> Wire transistors into AND, OR, XOR, NOT. The logic gates page showed how a handful of these compose into an adder and a flip-flop.</li>
  <li><strong>OS + CPU.</strong> Stack billions of those gates onto silicon and you have a CPU running fetch-decode-execute forever. Stack an operating system on top so many programs can share one CPU safely.</li>
  <li><strong>Memory, pointers, data structures.</strong> The CPU needs somewhere to put state. Memory is just a long array of bytes; pointers are just numbers that mean "look at that byte"; everything from arrays to hash maps is built on those three ideas.</li>
  <li><strong>Hashing.</strong> A hash function takes any sized input and returns a fixed-size fingerprint. Same input always produces the same output. Tiny change in input completely changes the output. Irreversible. This single primitive is the rest of the page.</li>
  <li><strong>Nodes and networking.</strong> Connect machines, give each one an address, agree on a protocol, and a single computer becomes a participant in a global network of millions.</li>
  <li><strong>Blockchain.</strong> Now do something nobody had figured out for thirty years: make those millions of mutually distrusting machines agree on the same history, without a central server, without a trusted third party, without anyone in charge.</li>
</ul>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the Byzantine Generals problem",
          body: `For decades, distributed systems researchers had a name for the hard part: the Byzantine Generals Problem. Multiple parties have to agree on an action, some of them may be lying, none of them can be assumed trustworthy. Theoretical results from the 1980s showed it was solvable in small groups with strong assumptions, but at planetary scale, in the open, with anonymous participants, nobody had a working solution. Satoshi's nine-page paper in 2008 solved it. Bitcoin is, before it's a currency, a Byzantine Generals solution running on the public internet.`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The CAP theorem, which you learned on the previous pages, is the formal proof of why this is hard. During a network partition you cannot have both consistency and availability. Bitcoin chose consistency above everything; the waiting is not inefficiency, it is the price of mathematical truth. <a href="/cap-theorem">← see: cap theorem</a></p>`,
        },
        { kind: "heading", text: "The breakthrough, in one sentence" },
        {
          kind: "prose",
          html: `<p>Combine a cryptographic hash with an economic incentive, broadcast everything over an open gossip network, and let the longest valid chain win. The hash makes tampering detectable; the incentive makes honest behaviour profitable; the gossip network removes the need for a coordinator; the longest-chain rule makes disagreement resolvable. Each ingredient is a page on this site. The combination is Bitcoin.</p>`,
        },
        { kind: "heading", text: "Build the chain yourself" },
        {
          kind: "prose",
          html: `<p>Before the formal anatomy, get your hands on it. Mine a block and watch the nonce search run live. Then try to cheat: edit a historical block and watch every block after it turn red. The hash box at the bottom is real SHA-256, so you can feel the avalanche that makes all of this work.</p>`,
        },
        { kind: "widget", name: "blockchain-simulator" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Inside a **block**, and the mining loop that produces it",
      blocks: [
        { kind: "heading", text: "What's actually in a block" },
        { kind: "diagram", name: "bitcoin-block-detail" },
        {
          kind: "prose",
          html: `<p>A Bitcoin block is a tiny 80-byte header plus a list of transactions. The header is what matters for the chain's integrity. The body is what matters for the economic content. Both are bound together by the Merkle root field.</p>
<p>Notice three of those fields are pointers back into the past or sideways into the present:</p>
<ul>
  <li><code>prev_hash</code> is the hash of the previous block's header. It nails this block to the rest of the chain.</li>
  <li><code>merkle_root</code> is the fingerprint of every transaction in this block. The hashing page introduced Merkle trees; this is one being used in production.</li>
  <li><code>nonce</code> is the only field a miner is free to spin: a 4-byte counter they iterate to find a valid hash.</li>
</ul>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBlockStruct },
            c: { language: "c", code: cBlockStruct },
          },
        },
        { kind: "heading", text: "The chain, made of these blocks" },
        { kind: "diagram", name: "block-chain" },
        {
          kind: "prose",
          html: `<p>Each block's <code>prev_hash</code> field is the hash of the previous block's full header. Change <em>anything</em> in any historical block (a transaction amount, an address, a timestamp) and that block's hash changes. The next block's stored <code>prev_hash</code> no longer matches. Every block after the tampered one is now invalid. To "fake" a change, you would have to re-mine every subsequent block, faster than the rest of the world is producing new ones. That is the entire security argument.</p>`,
        },
        { kind: "heading", text: "Inside a single block: the Merkle root" },
        { kind: "diagram", name: "merkle-tree" },
        {
          kind: "prose",
          html: `<p>The hashing page covered Merkle trees; here is where they pay off in production. The block's body might contain three thousand transactions; the block header carries a single 32-byte hash that fingerprints all of them. Change any leaf transaction and every hash on its path to the root changes. The 80-byte header inherits all the integrity guarantees of the megabyte-sized body, at zero extra cost.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The Merkle root is a hash of hashes: a tree of SHA-256 operations. Change any transaction anywhere in the tree and the root changes completely. The 80-byte header inherits all the integrity of the megabyte-sized body. This is the hashing page's Merkle tree in production. <a href="/hashing">← see: hashing</a></p>`,
        },
        { kind: "heading", text: "Mining: brute force, made expensive on purpose" },
        { kind: "diagram", name: "mining-nonce-search" },
        {
          kind: "prose",
          html: `<p>The catch on adding a block is that not every header is valid. The network agrees on a <strong>difficulty target</strong>: a 256-bit number, currently around <code>0x00000000000000000004…</code>, that the block's hash must be <em>less than</em>. Because SHA-256 has the avalanche property, the only way to hit such a target is to keep trying nonces until one comes out small enough. There is no algorithm. There is no shortcut. Only the loop.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMiningLoop },
            c: { language: "c", code: cMiningLoop },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// what 'hashrate' actually means",
          body: `When you read that the Bitcoin network has 600 exahashes per second of hashrate, that's the global sum of how many times per second every miner is running the loop above. Six hundred quintillion attempts per second. The network adjusts difficulty every 2,016 blocks (~two weeks) so that, on average, a valid block is found every 10 minutes, no matter how much hashpower joins or leaves. The probability is dialled by the target; the work is dialled by the world's mining hardware.`,
        },
        { kind: "heading", text: "Why this is a Byzantine fault-tolerant ledger" },
        {
          kind: "prose",
          html: `<p>Three things together make Bitcoin Byzantine fault tolerant:</p>
<ul>
  <li><strong>Cryptographic identity.</strong> Every transaction is signed; you can't forge somebody else's signature without their private key. The hashing page set up the primitive.</li>
  <li><strong>Hash-linked history.</strong> Tampering with any block invalidates every block after it. The chain itself is tamper-evident.</li>
  <li><strong>Proof-of-work + longest chain.</strong> Adding a new block costs energy. Whoever does more work, faster than everyone else, gets to extend the chain. To rewrite history, an attacker would have to redo all that work, and outpace the honest majority indefinitely. Game theory does the rest.</li>
</ul>
<p>Strip out any of the three and the system collapses. Together, they make decentralised agreement possible.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The CAP theorem explains why Bitcoin is slow. During normal operation Bitcoin chose EC, strong consistency, in the PACELC framework. Every confirmation is a distributed system choosing correctness over speed. Ten minutes is not a bug; it is the PACELC price of PC/EC across ten thousand mutually distrusting nodes. <a href="/pacelc">← see: pacelc</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "One transaction, through **every layer** on this site",
      blocks: [
        {
          kind: "prose",
          html: `<p>Follow a single Bitcoin transaction from your wallet to a confirmed block. At every step it's touching machinery from a different page on this site. By the time it's confirmed, every prior topic has been used at least once.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTxLifecycle },
            c: { language: "c", code: cTxLifecycle },
          },
        },
        { kind: "heading", text: "Gossip: how the transaction reaches the miners" },
        { kind: "diagram", name: "bitcoin-gossip" },
        {
          kind: "prose",
          html: `<p>Your wallet does not know which miner will include your transaction. It doesn't need to. It opens a TCP connection to any reachable node, sends the bytes, and the node forwards them to every peer it has. Each of those peers verifies the signature (more hashing) and forwards them again. Within a few seconds, every node on the planet has your transaction in their mempool. From there it is a matter of waiting for a miner to find a block that includes it.</p>`,
        },
        { kind: "heading", text: "The same bytes, all the way down" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: cByteOnTheWire },
            c: { language: "c", code: cByteOnTheWire },
          },
        },
        { kind: "heading", text: "Every page, doing its job, in one transaction" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "binary",
              value: "All of it",
              desc: "Every byte that crosses the wire, every byte in the wallet, every byte in the chain. Bitcoin is binary, all the way down to the gates the SHA-256 implementation uses.",
            },
            {
              label: "ASCII / encodings",
              value: "Addresses, JSON-RPC",
              desc: "Bitcoin addresses are Base58 or Bech32 strings, which is just ASCII on top of a binary encoding. Wallet APIs and RPC interfaces use JSON. The ASCII page's lesson (encodings are agreements) is everywhere.",
            },
            {
              label: "logic gates",
              value: "SHA-256 is gates",
              desc: "SHA-256 is, internally, AND/OR/XOR/NOT operations with bit shifts and rotations. Every hash computed for the chain is the logic gates page running at industrial scale.",
            },
            {
              label: "CPU",
              value: "Runs every node",
              desc: "Every miner, every full node, every wallet is a CPU executing fetch-decode-execute. The mining ASIC is a custom version of the same idea, hard-coded to do SHA-256 and almost nothing else.",
            },
            {
              label: "memory",
              value: "Mempool + UTXO set",
              desc: "Every node holds a copy of the unspent-output set (a hash map) and a mempool (another hash map) in RAM. Both are mutable, large, and the heart of validation performance.",
            },
            {
              label: "OS",
              value: "Sockets and processes",
              desc: "Bitcoin Core is a Linux/macOS/Windows process talking to other processes over TCP sockets. Every page from operating system to networking is in play.",
            },
            {
              label: "arrays + linked lists",
              value: "Blocks are a chain of nodes",
              desc: "The blockchain is, structurally, the linked-list page taken to its logical extreme: a chain of nodes, each pointing back at the previous via a cryptographic hash instead of a heap pointer. Each block's transactions are an array. The Merkle tree inside is built from arrays of hashes.",
            },
            {
              label: "pointers",
              value: "Hashes as pointers",
              desc: "The previous-block hash in every header is a pointer in the same sense as a C pointer: a number that means somewhere else. It just happens to be a content-addressable somewhere, not a memory address.",
            },
            {
              label: "hashing",
              value: "The entire premise",
              desc: "Take the hashing page away and there is no Bitcoin. SHA-256 makes the chain tamper-evident, the Merkle root tamper-evident, signatures verifiable, addresses derivable, proof-of-work meaningful. Every other page contributes; this one is essential.",
            },
            {
              label: "networking",
              value: "Gossip + TCP",
              desc: "Nodes find each other by IP, talk over TCP, and gossip messages in a peer-to-peer overlay. Without the networking page, there is no chain; only isolated computers each holding their own history.",
            },
            {
              label: "nodes",
              value: "Full / light / mining / archive",
              desc: "Every participant is a node in the sense the nodes page covered: an identity, some state, and connections to others. Bitcoin distinguishes the roles, but the underlying pattern is identical.",
            },
            {
              label: "compile vs runtime",
              value: "Static rules, dynamic state",
              desc: "Consensus rules are baked into the software, decided at compile time. Block content, mempool state, peer connections are all runtime. The compile-vs-runtime split shows up in every soft-fork and hard-fork debate.",
            },
          ],
        },
        { kind: "heading", text: "The closer" },
        {
          kind: "callout",
          variant: "info",
          title: "// from one transistor to consensus",
          body: `A transistor at Bell Labs switches a voltage. Wired into gates, the switches do logic. Wired into a CPU, the logic computes. Compute, fed memory, runs an operating system. The OS hands sockets to programs. Programs send bytes over networks. Bytes can be hashed into fingerprints. Fingerprints, chained, become a tamper-evident history. That history, gossiped between mutually distrusting nodes and protected by proof-of-work, becomes a ledger no one owns. Bitcoin is the moment that ladder closes: every previous page on the site simultaneously doing its job, with nothing left out, in a system where the math itself, not any institution, is the source of trust.`,
        },
        { kind: "heading", text: "The full PACELC picture" },
        {
          kind: "prose",
          html: `<p>Bitcoin is the most extreme PC/EC system ever built at planetary scale. During a partition it halts rather than risk chain divergence (PC: consistency over availability). During normal operation, every confirmation waits for global consensus, ten minutes per block (EC: consistency over latency).</p>
<p>Satoshi did not choose this arbitrarily. With money there is no such thing as reconciling later. The double-spend problem is the CAP theorem applied to a ledger: if two nodes accept the same coin simultaneously, the ledger is inconsistent and someone gets money they should not have. Proof of Work is the solution. Not a coordinator, not a trusted server, not a governance mechanism. Just mathematics that makes lying more expensive than honesty.</p>
<p>Every blockchain that came after Bitcoin is a different answer to the same PACELC question:</p>
<ul>
  <li><strong>Bitcoin</strong>: PC/EC. Absolute truth. Ten minutes.</li>
  <li><strong>Ethereum</strong>: PC/EC, strengthening. DeFi demands it.</li>
  <li><strong>Solana</strong>: PA/EL. Speed above all. Accept the outages.</li>
  <li><strong>Sui and Aptos</strong>: hybrid. Per-operation tradeoffs.</li>
</ul>
<p>Every chain is a public PACELC declaration. And now you understand every layer of every one of them. From the transistor to the tradeoff.</p>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>This page closes the ladder. The directions to walk from here are deep, in every direction:</p>
<ul>
  <li><strong>Read the Bitcoin whitepaper</strong>. Nine pages. Worth two hours of careful reading; you will understand most of it now.</li>
  <li><strong>Mastering Bitcoin (Andreas Antonopoulos)</strong>. The book-length version, free online, that walks you from key generation to consensus.</li>
  <li><strong>Ethereum and smart contracts</strong>. Same ladder, plus a Turing-complete VM on top. The "world computer" pitch.</li>
  <li><strong>Proof-of-stake systems (Ethereum after the Merge, Solana, Cosmos)</strong>. Same goal as proof-of-work, different economic primitive.</li>
  <li><strong>Layer-2 scaling (Lightning, rollups, channels)</strong>. How to get more transactions per second without touching the base chain.</li>
  <li><strong>Zero-knowledge proofs (zk-SNARKs, zk-STARKs)</strong>. The mathematical frontier; everything in this page, plus succinct proofs of computation.</li>
  <li><strong>The Byzantine Generals paper (Lamport, Shostak, Pease, 1982)</strong>. The original problem statement, surprisingly readable.</li>
</ul>`,
        },
        { kind: "heading", text: "Every page. One system." },
        {
          kind: "prose",
          html: `<p>This is not a connections section. This is a proof that every concept you learned was always pointing here.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "01 / number systems",
              value: "The human interface",
              desc: "A Bitcoin address is Base58. A private key is a 256-bit hex number. A block hash is 64 hex characters. Number systems are the human interface to Bitcoin's binary core.",
              href: "/number-systems",
            },
            {
              label: "02 / binary",
              value: "All the way to the copper",
              desc: "Every transaction is binary bytes on a wire. Every block header is 80 binary bytes. Every hash is 256 binary bits. Bitcoin is binary, all the way to the copper.",
              href: "/binary",
            },
            {
              label: "03 / ascii",
              value: "Commands are ASCII",
              desc: "Bitcoin network commands are ASCII strings: 'tx', 'block', 'version', 'inv'. Twelve bytes each, NUL-padded. The protocol that moves trillions is addressed in ASCII.",
              href: "/ascii",
            },
            {
              label: "04 / logic gates",
              value: "Proof of work is gates",
              desc: "SHA-256 is AND, XOR, NOT, bit rotations. Every hash that secures the chain is logic gates firing on silicon. The entire proof of work is logic gates at industrial scale.",
              href: "/logic-gates",
            },
            {
              label: "05 / cpu",
              value: "One loop, forever",
              desc: "Every miner is a CPU running one loop: hash the header, check the target, repeat. Bitcoin ASICs are custom CPUs built to run this loop and almost nothing else.",
              href: "/cpu",
            },
            {
              label: "06 / memory",
              value: "Who owns what",
              desc: "Every full node holds the UTXO set in RAM, a hash map of every unspent coin, hundreds of gigabytes. The heart of validation. Memory is where Bitcoin knows who owns what.",
              href: "/memory",
            },
            {
              label: "07 / operating system",
              value: "Runs the node",
              desc: "Bitcoin Core is an OS process. It manages TCP sockets, schedules peer connections, reads and writes to disk. The OS is what runs the node.",
              href: "/operating-system",
            },
            {
              label: "08 / variables",
              value: "Typed and sized",
              desc: "A transaction output is a struct, an address is a byte array, a nonce is a uint32. Every piece of Bitcoin's state is a variable with a type and a size.",
              href: "/variables",
            },
            {
              label: "09 / pointers",
              value: "The tamper-evidence argument",
              desc: "The prev_hash in every header is a pointer: not a memory address, a cryptographic content address. Change the content and the pointer breaks. That is the entire tamper-evidence argument.",
              href: "/pointers",
            },
            {
              label: "0A / compile vs runtime",
              value: "Rules vs state",
              desc: "Consensus rules are compile time: what counts as a valid block is baked in. Block content, mempool state, and peer connections are all runtime. Every soft-fork is a compile-time change to the validity rules.",
              href: "/compile-vs-runtime",
            },
            {
              label: "0B / arrays",
              value: "Everywhere",
              desc: "A block's transactions are an array, the mempool is an array of pending txns, the blockchain itself is an array of blocks, the Merkle tree is built from arrays of hashes. Arrays are everywhere in Bitcoin.",
              href: "/arrays",
            },
            {
              label: "0C / linked lists",
              value: "Cryptographic links",
              desc: "The blockchain is a linked list. Each node holds transactions and points to the previous via hash. The pointer is cryptographic, not positional. Change any node and the link breaks.",
              href: "/linked-list",
            },
            {
              label: "0D / hashing",
              value: "The entire premise",
              desc: "Take the hashing page away and there is no Bitcoin. SHA-256 makes the chain tamper-evident, the Merkle root tamper-evident, signatures verifiable, proof-of-work meaningful. Hashing is the entire premise.",
              href: "/hashing",
            },
            {
              label: "0E / nodes",
              value: "The network is the nodes",
              desc: "Every Bitcoin node is a participant. Full nodes validate everything, miners produce blocks, light nodes verify headers only. The network is the nodes.",
              href: "/nodes",
            },
            {
              label: "0F / networking",
              value: "Or no chain at all",
              desc: "Nodes find each other by IP, talk over TCP, gossip transactions and blocks. Without the network there is no chain, only isolated computers each holding their own history.",
              href: "/networking",
            },
            {
              label: "10 / distributed systems",
              value: "Trustless, and it works",
              desc: "Bitcoin is a distributed system with one extraordinary property: the nodes do not trust each other, and it works anyway. Every distributed-systems concept you learned shows up in Bitcoin.",
              href: "/distributed-systems",
            },
            {
              label: "11 / cap theorem",
              value: "The waiting is the choice",
              desc: "Bitcoin chose CP. During a partition: halt rather than diverge, consistency above availability. Every other blockchain is a different answer to the same CAP question. The waiting is the choice.",
              href: "/cap-theorem",
            },
            {
              label: "12 / pacelc",
              value: "PC/EC, always",
              desc: "Bitcoin chose PC/EC. Even during normal operation, pay the latency cost for consistency. Ten-minute blocks. The price of absolute truth in a trustless world.",
              href: "/pacelc",
            },
          ],
        },
        { kind: "heading", text: "// end of root.system" },
        {
          kind: "prose",
          html: `<p>You started with a transistor. A single switch. On or off. 1 or 0. You followed that switch through nineteen pages. And you arrived here. At a network that processes billions of dollars every day, that has never been successfully altered, that nobody owns, that nobody controls, that cannot be shut down.</p>
<p>Not because of legal protection. Not because of institutional trust. Not because anyone decided it should exist. Because of mathematics. Running on transistors, wired into logic gates, organised into a CPU, running an operating system, allocating memory, following pointers, organising data structures, hashing everything, broadcasting over a network, letting nodes agree, choosing consistency over speed, making lying computationally impossible.</p>
<p>From one switch in 1947. To a trustless global financial network in 2008. Powered by every concept on this site. All of them. Simultaneously. Right now.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the last line",
          body: `You don't just understand blockchain. You understand computing. All of it. From the bottom up.`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "end of root.system",
    title: "Start over from the transistor.",
    href: "/",
    label: "home",
    variant: "cyan",
  },
};
