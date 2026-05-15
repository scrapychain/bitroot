import type { PageContent } from "@/types/content";

const rustNode = `// The data-structure node, the smallest of the three meanings.
// A struct with a value and one or more pointers to other nodes.
struct ListNode<T> {
    value: T,
    next: Option<Box<ListNode<T>>>,
}

// A tree node knows two neighbours.
struct TreeNode<T> {
    value: T,
    left:  Option<Box<TreeNode<T>>>,
    right: Option<Box<TreeNode<T>>>,
}

// A graph node knows many.
struct GraphNode<T> {
    value: T,
    edges: Vec<NodeId>,        // indices into an arena of GraphNodes
}

// In all three: a node = "a value, plus a way to find related nodes."
// The data structure is just a choice about how many neighbours a node
// can know, and whether the connections form a chain, a tree, or a web.`;

const cNode = `#include <stdint.h>
#include <stdlib.h>

// The C version of the same idea. Plain struct, raw pointers.
typedef struct ListNode {
    int               value;
    struct ListNode  *next;
} ListNode;

typedef struct TreeNode {
    int               value;
    struct TreeNode  *left;
    struct TreeNode  *right;
} TreeNode;

typedef struct GraphNode {
    int               value;
    uint32_t         *edge_ids;   // dynamic array of node IDs
    size_t            edge_count;
} GraphNode;

// Allocate a list node. Heap, malloc, raw pointer. Nothing magic.
ListNode *list_node_new(int value) {
    ListNode *n = malloc(sizeof *n);
    n->value = value;
    n->next  = NULL;
    return n;
}`;

const cBitcoinPeer = `// A blockchain node is just a TCP server. This sketch is what every
// Bitcoin / Ethereum / Solana node looks like at the network boundary.
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>

int main(void) {
    // Step 1: open a socket and listen for peers (port 8333 = Bitcoin).
    int s = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = { 0 };
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(8333);
    addr.sin_addr.s_addr = INADDR_ANY;
    bind(s, (struct sockaddr*)&addr, sizeof addr);
    listen(s, 64);

    // Step 2: accept peers, exchange "version" messages, gossip.
    //   For each new peer:
    //     - send "version" message (our height, services, software)
    //     - read their "version", confirm with "verack"
    //     - now we can exchange "inv" announcements, request blocks,
    //       forward transactions through "tx" messages.
    //
    // Every Bitcoin Core, geth, and reth instance on the planet is
    // doing exactly this, with thousands of peers at once.
    return 0;
}`;

const rustNodeAddressing = `// What does it mean to ADDRESS a node?  The answer scales with
// the meaning of "node".
//
//   Data-structure node:  a heap address (a raw 64-bit pointer)
//   Network node:         an IP address  (32 bits for IPv4, 128 for IPv6)
//   Blockchain node:      a peer ID, often a public-key hash
//
// All three are "a number you can look up to find the node."
fn data_structure_address(node: &ListNode<i32>) -> *const ListNode<i32> {
    node as *const _                 // raw pointer; 8 bytes on 64-bit
}

// Network address: IPv4 packs four bytes into one u32.
fn network_address(a: u8, b: u8, c: u8, d: u8) -> u32 {
    ((a as u32) << 24) | ((b as u32) << 16) | ((c as u32) << 8) | (d as u32)
}

// Blockchain peer ID: a cryptographic hash of the node's public key.
// libp2p, Bitcoin, Ethereum all do this. The address IS the identity:
// only the holder of the private key can sign as that node.
fn peer_id(pubkey: &[u8]) -> Vec<u8> {
    use sha2::{Sha256, Digest};
    Sha256::digest(pubkey).to_vec()
}`;

export const nodes: PageContent = {
  slug: "nodes",
  hexLabel: "0x0E",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x0E / structure",
    title: `One word.<br><span class="highlight">Three scales.</span>`,
    lede: `A <strong>node</strong> in a data structure is a small struct on the heap holding a value and a pointer to its neighbour. A <strong>node</strong> on a network is a whole computer with an IP address. A <strong>node</strong> in a blockchain is a computer running protocol software that holds a copy of the chain. Same word, three scales, one essential pattern: a participant with an identity, holding state, connected to others. This page is about that pattern.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The pattern: **a value, plus a way to find related ones**",
      blocks: [
        {
          kind: "prose",
          html: `<p>The word <strong>node</strong> shows up in three very different contexts in computer science, and it is the same word for a reason. At every scale, a node is the same essential thing:</p>
<ul>
  <li>It has an <strong>identity</strong> (an address by which others can find it).</li>
  <li>It holds some <strong>state</strong> (a value, or several).</li>
  <li>It knows about <strong>some neighbours</strong> (one, two, or many).</li>
</ul>
<p>Change the size of the node and the type of the connections, and you go from a tiny struct on the heap to a single computer to an entire participant in a global financial network. The shape never changes.</p>`,
        },
        { kind: "heading", text: "The picture at every scale" },
        { kind: "diagram", name: "node-three-meanings" },
        {
          kind: "callout",
          variant: "info",
          title: "// fractal, not analogical",
          body: `The three scales aren't a metaphor for each other; they're the same idea applied at different orders of magnitude. A linked-list node is ~16 bytes on the heap, addressed by a pointer. A network node is a whole computer, addressed by an IP address. A blockchain node is a computer running specific software, addressed by a public-key hash. Same three properties (identity, state, neighbours) every time.`,
        },
        { kind: "heading", text: "The data-structure node, in code" },
        {
          kind: "prose",
          html: `<p>The linked-list page already covered the smallest version. A node there is a struct with a value and a <code>next</code> pointer. Variations follow naturally: a tree node has <em>two</em> neighbours, a graph node has <em>many</em>, and that is essentially the whole taxonomy of pointer-based data structures.</p>`,
        },
        { kind: "diagram", name: "data-structure-nodes" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustNode },
            c: { language: "c", code: cNode },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the linked-list page",
          body: `The linked-list page introduced the smallest version of this idea: a node with one <code>next</code> pointer. Everything on this page extends that pattern. A binary tree is the same node with two pointers. A graph is the same node with a vector of pointers. A hash-map bucket chain is the linked-list version, head-pointed-at by a slot in an array. The rest of the data-structure landscape is just choices about how many neighbours a node can have and how it finds them.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "A **network node** is the same idea, with an IP address",
      blocks: [
        {
          kind: "prose",
          html: `<p>Walk away from the heap and onto the wire. A <strong>network node</strong> is any device that participates in a network: a laptop, a phone, a router, a server, a printer, an industrial sensor, a satellite. The thing that makes it a node and not just a chip is that it has an <strong>address</strong> on the network and can be communicated with using a shared protocol.</p>
<p>Map the three properties straight across from the data-structure version:</p>
<ul>
  <li><strong>Identity.</strong> Instead of a heap address, an IP address (32 bits for IPv4, 128 for IPv6). Sometimes layered, with MAC addresses below and DNS names above.</li>
  <li><strong>State.</strong> Whatever the machine is doing internally. A router holds a routing table; a laptop holds your applications; a server holds the database. The state is bigger, but it's still just state.</li>
  <li><strong>Neighbours.</strong> The other nodes it has open connections to. A home laptop knows its router and a few cloud servers. A core internet router knows hundreds of peer routers. The connections are TCP sockets, not heap pointers, but the role is identical.</li>
</ul>`,
        },
        { kind: "heading", text: "From struct pointer to IP address" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustNodeAddressing },
            c: { language: "rust", code: rustNodeAddressing },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the binary page",
          body: `An IP address is just a number, written in a friendly way. The binary page made the same point about <code>237</code> being identical to <code>11101101</code> being identical to <code>0xED</code>. A network address is that same idea, scaled up: a 32-bit (or 128-bit) integer that uniquely names a participant. The dotted notation <code>192.168.1.42</code> is for humans; the wire only sees the bits.`,
        },
        { kind: "heading", text: "What it means for two network nodes to be connected" },
        {
          kind: "prose",
          html: `<p>For two data-structure nodes, "connected" means a pointer. For two network nodes, "connected" usually means a TCP session: a pair of socket file descriptors, one on each machine, holding buffers and sequence numbers, ready to ferry bytes either way. The connection is bidirectional and stateful: dropping it requires explicit teardown. Setting it up requires the three-way handshake the networking page will cover next.</p>
<p>This is also where the difference in scale becomes obvious. A linked list of ten thousand nodes is a tiny amount of memory. A network of ten thousand nodes is BGP, peering, sub-millisecond routing, undersea cables. Same word, vastly more machinery beneath it.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// looking ahead to the networking page",
          body: `Everything on this page about network nodes is set up for the next page, which goes into detail: how addresses are assigned, how packets are routed between nodes, how TCP turns an unreliable network of nodes into a reliable byte stream, and how HTTPS layers cryptographic trust on top.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "A **blockchain node** is a network node with strong opinions",
      blocks: [
        {
          kind: "prose",
          html: `<p>One more level up. A <strong>blockchain node</strong> is just a network node running specific protocol software. Bitcoin Core, geth, reth, lighthouse, solana-validator: each is a daemon you install on a computer, point at the internet, and let run. It opens TCP connections to other nodes running the same software, swaps "version" messages, and starts exchanging blocks and transactions according to the protocol.</p>
<p>Map the three properties one more time:</p>
<ul>
  <li><strong>Identity.</strong> A peer ID, usually derived from a cryptographic key pair, so the identity is provable. The blockchain pages would call this "an address you can sign as."</li>
  <li><strong>State.</strong> A copy of the chain, a mempool of pending transactions, a peer table, and a wallet (optional). Some nodes keep everything; others keep just the headers.</li>
  <li><strong>Neighbours.</strong> Eight to a few dozen "peer" connections to other nodes in the network, found by gossip and bootstrap lists. Each peer is just an open TCP socket to another machine.</li>
</ul>`,
        },
        { kind: "heading", text: "Not every blockchain node is the same" },
        { kind: "diagram", name: "blockchain-node-types" },
        {
          kind: "prose",
          html: `<p>The protocol is a single specification, but real-world nodes specialise. Four common roles, with different storage and bandwidth costs:</p>
<ul>
  <li><strong>Full node.</strong> Downloads every block from genesis, verifies every transaction, keeps the full unspent-output (UTXO) set or state trie in memory. This is the trustless backbone: a full node trusts nothing it cannot independently re-verify. Around 700 GB for Bitcoin, well over 1 TB for an Ethereum full node.</li>
  <li><strong>Light / SPV node.</strong> Downloads only block <em>headers</em> (~80 bytes each in Bitcoin, similar in Ethereum). Asks full nodes for Merkle proofs when it needs to verify that a specific transaction is included in a block. Wallet apps on your phone are light nodes; they trade some trust for not needing to download the whole chain.</li>
  <li><strong>Mining / validator.</strong> A full node, plus the extra job of <em>proposing</em> new blocks. In proof-of-work systems (Bitcoin), this means racing to find a nonce. In proof-of-stake (Ethereum after the Merge, Solana, Cosmos), it means being randomly selected to attest to or propose a block, after locking up a stake of native currency. The reward for a successful block goes to whoever proposed it.</li>
  <li><strong>Archive node.</strong> A full node that keeps not just the current state, but every historical state, at every block. Block explorers and analytics platforms (Etherscan, Dune) run on archive nodes. Storage is measured in many TB.</li>
</ul>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: cBitcoinPeer },
            c: { language: "c", code: cBitcoinPeer },
          },
        },
        { kind: "heading", text: "Why blockchains needed this whole vocabulary" },
        {
          kind: "prose",
          html: `<p>Plain network nodes (a laptop talking to a server, the page after next) only need to address each other. A blockchain has the harder problem: <em>thousands of mutually distrusting nodes, each running their own copy of the same software, somehow agreeing on the same history.</em></p>
<p>That is the entire reason the vocabulary gets denser at this level. Network nodes need addresses and a transport protocol; blockchain nodes need addresses, a transport protocol, <em>and</em> a consensus protocol on top. The consensus protocol is the rulebook for which sequence of blocks is "the" chain when peers disagree.</p>
<p>The other reason: a blockchain node's address is its <em>public key</em>. The identity is cryptographic, not just network-assigned. You can't fake being node X without holding X's private key, because every action a node takes (proposing a block, signing a transaction, signing an attestation) is signed. The hashing page covered the primitive. The pay-off is identity that cannot be impersonated.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the hashing page",
          body: `The thing that makes a blockchain node's identity strong is the same primitive that makes a Merkle root tamper-evident: cryptographic hashing. A peer ID is typically <code>hash(public_key)</code>. Block validation is <code>hash(block_header)</code> compared to the chain's known tip. Transaction signing uses hash-based message authentication. Strip out cryptographic hashing and a blockchain is just a fragile, byzantine-fault-intolerant gossip network.`,
        },
        { kind: "heading", text: "The three meanings, side by side" },
        {
          kind: "table",
          headers: ["", "data-structure node", "network node", "blockchain node"],
          rows: [
            [
              "<strong>physical form</strong>",
              "a struct on the heap",
              "a whole computer",
              "a computer running protocol software",
            ],
            [
              "<strong>identity</strong>",
              "heap pointer (8 bytes)",
              "IP address (32 or 128 bits)",
              "public-key hash (256 bits)",
            ],
            [
              "<strong>state</strong>",
              "a value and pointer(s)",
              "OS + running applications",
              "chain + mempool + peer table",
            ],
            [
              "<strong>neighbours</strong>",
              "one to many other nodes via pointers",
              "open TCP sessions to other machines",
              "8 to 50 peer sockets, found by gossip",
            ],
            [
              "<strong>how connections form</strong>",
              "set a pointer field",
              "TCP three-way handshake",
              "TCP handshake, then version exchange",
            ],
            [
              "<strong>trust model</strong>",
              "single program, no question of trust",
              "trust your ISP and the routes they pick",
              "trust nothing; verify everything cryptographically",
            ],
          ],
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>This was the vocabulary page. The mechanics live on other pages:</p>
<ul>
  <li><strong>Data-structure nodes</strong>: the linked-list page goes deep on lists, splices, and the cache penalty; from there, trees and graphs are natural extensions.</li>
  <li><strong>Network nodes</strong>: the very next page, on networking, covers IP addresses, packets, TCP, and routing in detail.</li>
  <li><strong>Blockchain nodes</strong>: the hashing page sets up the cryptographic primitive; the networking page covers gossip; later pages will cover consensus protocols (Nakamoto, BFT, proof-of-stake), Merkle proofs in practice, and how light clients trust full clients without trusting them.</li>
  <li><strong>Other "node" meanings worth knowing</strong>: the DOM in browsers (HTML is a tree of nodes), Kubernetes (a cluster is a set of nodes), and computational graphs in deep-learning frameworks. Same word, same essential pattern, applied yet again.</li>
</ul>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x0F",
    title: "One machine becomes many. Networking is where every previous topic shows up.",
    href: "/networking",
    label: "networking",
    variant: "cyan",
  },
};
