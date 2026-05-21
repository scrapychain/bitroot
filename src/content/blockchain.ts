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

export const blockchain: PageContent = {
  slug: "blockchain",
  hexLabel: "0x13",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x13 / system",
    title: `From one switch<br><span class="highlight">to a financial network nobody owns.</span>`,
    lede: `Bell Labs, 1947. A small piece of germanium let electricity change direction on command. Two states, one switch. In 2008, nine pages by Satoshi Nakamoto turned that same primitive, scaled by billions, into a network that lets thousands of strangers agree on a shared truth without trusting each other. This page is the bridge between those two events. It's the capstone: every other page on the site shows up here, in order, with nothing missing.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The **ladder**: from a transistor to Bitcoin",
      blocks: [
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
        { kind: "heading", text: "The breakthrough, in one sentence" },
        {
          kind: "prose",
          html: `<p>Combine a cryptographic hash with an economic incentive, broadcast everything over an open gossip network, and let the longest valid chain win. The hash makes tampering detectable; the incentive makes honest behaviour profitable; the gossip network removes the need for a coordinator; the longest-chain rule makes disagreement resolvable. Each ingredient is a page on this site. The combination is Bitcoin.</p>`,
        },
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
            c: { language: "rust", code: rustBlockStruct },
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
            c: { language: "rust", code: rustMiningLoop },
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
            c: { language: "rust", code: rustTxLifecycle },
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
      ],
    },
  ],
  nextUp: {
    eyebrow: "end of root.system",
    title: "You've reached the top of the stack. Start over from the bottom.",
    href: "/",
    label: "home",
    variant: "cyan",
  },
};
