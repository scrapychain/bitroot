import type { PageContent } from "@/types/content";

const rustTcpPair = `// One node, two roles: a TCP listener (the "server")
// and a TCP dialer (the "client"). Every node in a real
// distributed system runs both at once.
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn run_server(addr: &str) -> std::io::Result<()> {
    let listener = TcpListener::bind(addr)?;
    for incoming in listener.incoming() {
        let mut sock = incoming?;
        let mut buf = [0u8; 1024];
        let n = sock.read(&mut buf)?;
        // Echo back; in a real node we'd parse a protocol message
        // (ping, gossip-tx, request-block, etc.) and dispatch.
        sock.write_all(&buf[..n])?;
    }
    Ok(())
}

fn dial(peer: &str, payload: &[u8]) -> std::io::Result<Vec<u8>> {
    let mut sock = TcpStream::connect(peer)?;
    sock.write_all(payload)?;
    let mut reply = Vec::new();
    sock.read_to_end(&mut reply)?;
    Ok(reply)
}`;

const cTcpPair = `#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

// Listening side of a node.
int run_server(uint16_t port) {
    int s = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = { 0 };
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = INADDR_ANY;
    bind(s, (struct sockaddr*)&addr, sizeof addr);
    listen(s, 32);

    for (;;) {
        int c = accept(s, NULL, NULL);
        char buf[1024];
        ssize_t n = recv(c, buf, sizeof buf, 0);
        send(c, buf, n, 0);             // echo for the demo
        close(c);
    }
}

// Dialing side. Open a connection to a peer, send bytes, read a reply.
int dial(const char *ip, uint16_t port, const char *payload) {
    int s = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = { 0 };
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    inet_pton(AF_INET, ip, &addr.sin_addr);
    connect(s, (struct sockaddr*)&addr, sizeof addr);

    send(s, payload, strlen(payload), 0);
    char buf[1024];
    ssize_t n = recv(s, buf, sizeof buf, 0);
    close(s);
    return (int)n;
}`;

const rustHashRing = `// Consistent hashing: a fixed ring of slots from 0 to 2^32 - 1.
// Each node is placed at hash(node_id) on the ring; each key is placed
// at hash(key); a key belongs to the first node clockwise from its
// position. Adding or removing a node only relocates 1/N of keys.
use sha2::{Sha256, Digest};

fn hash_to_u32(s: &str) -> u32 {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    let digest = h.finalize();
    u32::from_be_bytes([digest[0], digest[1], digest[2], digest[3]])
}

struct HashRing {
    nodes: Vec<(u32, String)>,   // (position_on_ring, node_id)
}

impl HashRing {
    fn add(&mut self, node: &str) {
        self.nodes.push((hash_to_u32(node), node.to_string()));
        self.nodes.sort_by_key(|&(pos, _)| pos);
    }

    fn owner(&self, key: &str) -> &str {
        let kpos = hash_to_u32(key);
        // First node whose position >= key position; wrap to first if none.
        self.nodes
            .iter()
            .find(|&&(pos, _)| pos >= kpos)
            .map(|(_, id)| id.as_str())
            .unwrap_or(&self.nodes[0].1)
    }
}

// In Cassandra, DynamoDB, memcached clusters: this is how you find the
// node that owns a given key. Add a node and only ~1/N of keys move.`;

const rustGossip = `// A toy gossip loop. Each tick: pick a random peer, send our current
// view. Over enough ticks, every node converges to the same state.
use std::collections::HashSet;

struct Node {
    id: u32,
    peers: Vec<u32>,
    seen: HashSet<u32>,   // ids of messages we've already received
}

impl Node {
    fn receive(&mut self, msg_id: u32) -> bool {
        // Return true if this is a new message (worth forwarding).
        self.seen.insert(msg_id)
    }

    fn gossip(&self, msg_id: u32, network: &mut [Node]) {
        // Forward to a small random subset of peers.
        for &peer_id in self.peers.iter().take(3) {
            let peer = &mut network[peer_id as usize];
            if peer.receive(msg_id) {
                // peer also gossips on next tick; epidemic spread.
            }
        }
    }
}

// Real implementations:
//  - Bitcoin: send "inv" announcement, peer requests with "getdata"
//  - Ethereum devp2p: same pattern, richer message types
//  - SWIM (HashiCorp memberlist, Cassandra): ping + indirect ping
//  - HyParView + Plumtree (Erlang): structured gossip overlays`;

const cBftSketch = `// Byzantine fault tolerance: with f faulty nodes you need at least
// 3f + 1 total to guarantee agreement.
//
//   f = 0  ->  n = 1   (trivial, single trusted node)
//   f = 1  ->  n = 4   (3 honest, 1 byzantine)
//   f = 2  ->  n = 7   (5 honest, 2 byzantine)
//   f = 3  ->  n = 10  (PBFT can guarantee safety + liveness)
//
// The intuition: each "phase" needs 2f+1 acknowledgements to be sure
// the agreement isn't being faked, and the network must still progress
// even with f silent nodes. 2f+1 (for safety) + f (to outvote bad
// quorum) = 3f+1 minimum.
//
// PBFT (Castro & Liskov, 1999) made this practical. Tendermint,
// HotStuff, Diem BFT, and many modern proof-of-stake chains
// are descendants of PBFT.

#include <stdbool.h>
#include <stdint.h>

bool can_agree(int total_nodes, int faulty) {
    return total_nodes >= 3 * faulty + 1;
}`;

export const distributedSystems: PageContent = {
  slug: "distributed-systems",
  hexLabel: "0x10",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x10 / system",
    title: `No single machine<br><span class="highlight">knows everything.</span>`,
    lede: `A <strong>distributed system</strong> is a set of independent computers that, to anyone using them, appear as one coherent system. There is no boss, no shared clock, no shared memory; nodes can crash, lie, lose messages, or drop off the network entirely. Despite all of that, the system has to keep working and keep agreeing on a single truth. Everything that follows is the techniques humanity has invented to make that possible.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What is a **distributed system**?",
      blocks: [
        {
          kind: "prose",
          html: `<p>Imagine a village where everyone keeps the same ledger. When you spend money, you announce it; everyone updates their copy; the next time you try to spend, everyone checks their own copy. No bank. No central record. The truth is whatever a majority of ledgers say. That, in one sentence, is a distributed system.</p>
<p>Three things make distributed systems hard, and they're hard in a way that single-machine programming never prepared you for:</p>
<ul>
  <li><strong>No shared memory.</strong> Nodes can only know what other nodes tell them, and the telling happens over a network that drops, delays, and reorders messages.</li>
  <li><strong>No shared clock.</strong> Different machines disagree about what time it is, sometimes by seconds. You cannot rely on "I sent this first" being globally true.</li>
  <li><strong>Partial failure.</strong> In a single program, either it runs or it crashes. In a distributed system, half of the nodes might be working while the other half are unreachable, and they cannot tell which side of that partition they are on.</li>
</ul>`,
        },
        { kind: "heading", text: "The Byzantine Generals problem" },
        {
          kind: "prose",
          html: `<p>The classical statement of the hardest version of this problem is from 1982 (Lamport, Shostak, Pease). Imagine several generals of the Byzantine army surrounding an enemy city. They must agree to attack at the same time or not at all. They communicate only by messenger. Some of the messengers may be intercepted. <em>Some of the generals may be traitors</em>, sending different orders to different generals to sow confusion.</p>
<p>Can the loyal generals still reach an agreement, even with traitors among them? The paper proved that yes, they can; but only if more than two thirds of the generals are honest. That two-thirds threshold reappears in every distributed system ever since.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the ledger analogy",
          body: `Replace "general" with "computer", "messenger" with "TCP connection", and "loyal vs traitor" with "honest vs malicious node", and you have the model that underlies every modern distributed database, every blockchain, and most cluster managers. The agreement isn't social; it's mathematical, secured by a quorum.`,
        },
        { kind: "heading", text: "See it: clicking a node propagates a message" },
        { kind: "widget", name: "gossip-network" },
        {
          kind: "prose",
          html: `<p>That is, in miniature, the basic mechanic. A node receives a message, then forwards it to the peers it knows about. Each of <em>those</em> forwards it onward. There is no coordinator and no central server; the message simply spreads, like a rumour in a crowded room, until everyone has it.</p>
<p>Most of the rest of this page is about the things that go wrong with this picture and the tricks to fix them.</p>`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "How nodes **agree**: CAP, gossip, partitions",
      blocks: [
        { kind: "heading", text: "The CAP theorem: pick any two" },
        {
          kind: "prose",
          html: `<p>Eric Brewer's CAP theorem (2000) is the most famous result in distributed systems. It states that a system can guarantee at most two of the following three properties:</p>
<ul>
  <li><strong>Consistency (C)</strong>: every read sees the most recent write.</li>
  <li><strong>Availability (A)</strong>: every request gets some response (not an error).</li>
  <li><strong>Partition tolerance (P)</strong>: the system keeps working when the network splits.</li>
</ul>
<p>In practice, partition tolerance is non-negotiable; networks <em>will</em> partition. So the real choice is between C and A under partition. That's the actual tradeoff every database designer makes.</p>`,
        },
        { kind: "widget", name: "cap-triangle" },
        {
          kind: "callout",
          variant: "info",
          title: "// CAP, refined: PACELC",
          body: `Daniel Abadi's PACELC formulation (2010) makes CAP more precise: under a Partition you choose between A and C, <em>else</em> (no partition) you choose between Latency and Consistency. Most production systems pick AP under partition and EL (low latency over strong consistency) otherwise: DynamoDB, Cassandra, Riak. Strongly consistent systems like Spanner or Bitcoin pick CP under partition and pay the latency cost.`,
        },
        { kind: "heading", text: "What happens when the network splits" },
        { kind: "widget", name: "network-partition" },
        {
          kind: "prose",
          html: `<p>Partitions are the heart of the problem. While the network is split, the two halves cannot tell which side has the "true" history. Each side can keep accepting writes (preserving availability) but those writes will diverge. When the partition heals, the system has to reconcile.</p>
<p>Strategies for reconciliation, roughly from simplest to most clever:</p>
<ul>
  <li><strong>Last write wins.</strong> Use a wall-clock timestamp on every write; the latest timestamp wins. Simple, but lossy: the older write is silently dropped.</li>
  <li><strong>Version vectors / Lamport clocks.</strong> Track logical causality between updates so you can tell which write happened "before" the other even without synchronised clocks.</li>
  <li><strong>CRDTs (Conflict-free Replicated Data Types).</strong> Data structures designed so that merging two divergent copies always produces the same result regardless of order. Used in collaborative editors like Figma and Linear's sync layer.</li>
  <li><strong>Consensus protocols.</strong> Don't allow divergence in the first place: every write requires a quorum of nodes to agree. Paxos, Raft, PBFT, HotStuff. Stronger consistency, higher latency.</li>
</ul>`,
        },
        { kind: "heading", text: "Gossip: how information spreads without a coordinator" },
        {
          kind: "prose",
          html: `<p>The interactive widget at the top of the page was a sketch of <strong>gossip</strong>. Concrete properties of real gossip protocols:</p>
<ul>
  <li><strong>Epidemic.</strong> Each node periodically picks a few peers at random and exchanges state. Information spreads exponentially; full network coverage is reached in O(log n) rounds.</li>
  <li><strong>Resilient.</strong> No central node to fail. Drop half the nodes; the survivors keep gossiping.</li>
  <li><strong>Tunable.</strong> Choose the fanout (how many peers per round) and the round duration to trade bandwidth for convergence speed.</li>
  <li><strong>Eventually consistent.</strong> All live nodes will agree, eventually. The word "eventually" is doing real work.</li>
</ul>
<p>Real gossip protocols include SWIM (used by HashiCorp memberlist, Consul, Cassandra), HyParView + Plumtree (Erlang clusters), and the custom flooding used by Bitcoin and Ethereum. The networking page set up TCP and IP; gossip is what most distributed systems do on top.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the hashing page",
          body: `Many gossip implementations use <strong>consistent hashing</strong> (a hash ring) to decide which node "owns" which piece of state. Each node and each key get a position on a ring computed from <code>hash(id) mod 2^32</code>; a key is owned by the next node clockwise from its position. Adding or removing one node only moves <code>1/N</code> of the keys, not all of them. The hashing page is the prerequisite.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Distributed systems in **code**, and why Bitcoin is one",
      blocks: [
        { kind: "heading", text: "1. The connection: every node is a TCP listener and a TCP dialer" },
        {
          kind: "prose",
          html: `<p>Every node in a distributed system has two faces. It listens on a port (for inbound peers) and dials peers on their ports (for outbound traffic). The OS handles the byte-level transport; the application speaks a protocol on top. Below: the C and Rust skeletons that every node, from a Raft replica to a Bitcoin Core instance, is built around.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTcpPair },
            c: { language: "c", code: cTcpPair },
          },
        },
        { kind: "heading", text: "2. The hash ring: where does this key live?" },
        {
          kind: "prose",
          html: `<p>Once you have many nodes, the next question is "which node owns which data?" The naive answer (<code>hash(key) mod N</code>) breaks every time you add or remove a node: <em>all</em> keys need to be remapped. Consistent hashing fixes this by placing both nodes and keys on a virtual ring and assigning each key to the next node clockwise from its position. Add a new node and only the keys near its ring position move.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustHashRing },
            c: { language: "rust", code: rustHashRing },
          },
        },
        { kind: "heading", text: "3. A gossip protocol, simplified" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustGossip },
            c: { language: "rust", code: rustGossip },
          },
        },
        { kind: "heading", text: "Byzantine fault tolerance: 3f + 1" },
        {
          kind: "prose",
          html: `<p>A non-Byzantine consensus algorithm (Paxos, Raft) tolerates <em>crash</em> failures: a node either runs honestly or stops responding. With <em>n</em> nodes, Raft survives <code>(n-1)/2</code> crashes.</p>
<p>Byzantine consensus is stricter: nodes might lie, send conflicting messages to different peers, or collude. The classical result (Lamport et al., 1982) says you need <strong>at least 3f + 1 total nodes</strong> to tolerate <em>f</em> Byzantine faults:</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: cBftSketch },
            c: { language: "c", code: cBftSketch },
          },
        },
        { kind: "heading", text: "State machine replication: the trick behind every cluster" },
        {
          kind: "prose",
          html: `<p>The unifying idea behind every consensus protocol is <strong>state machine replication</strong>: take a deterministic state machine (a database, a key-value store, a blockchain ledger), apply the same sequence of inputs on every node, and every node ends up in the same state. The consensus protocol's only job is to agree on the order of inputs.</p>
<ul>
  <li>Paxos / Raft: agree on the log entries (crash-fault tolerant). Backbone of etcd, ZooKeeper, CockroachDB, Spanner.</li>
  <li>PBFT / HotStuff / Tendermint: agree on the log entries (Byzantine fault tolerant). Used by Diem, Cosmos, Aptos, modern proof-of-stake chains.</li>
  <li>Nakamoto consensus (Bitcoin): agree on the longest valid chain. Eventually consistent, probabilistic finality, no quorum required.</li>
</ul>`,
        },
        { kind: "heading", text: "Bitcoin is a distributed system" },
        {
          kind: "prose",
          html: `<p>Once you have the vocabulary above, Bitcoin slots into it cleanly:</p>
<ul>
  <li>The <strong>ledger</strong> everyone keeps is the blockchain.</li>
  <li>Each <strong>node</strong> is a computer running Bitcoin Core (written in C++) or a compatible implementation.</li>
  <li>The <strong>gossip protocol</strong> spreads transactions and blocks. <code>inv</code>, <code>getdata</code>, <code>tx</code>, <code>block</code> are message types on a TCP overlay.</li>
  <li>The <strong>consensus mechanism</strong> is proof-of-work: find a nonce that hashes the block header below a target, broadcast the block, and the rest of the network either accepts it (extends the chain) or rejects it.</li>
  <li>The <strong>CAP choice</strong>: Bitcoin is CP. Under a network partition, both halves keep producing blocks but only one chain will eventually be canonical. Availability of writes degrades; consistency wins.</li>
</ul>
<p>Three blockchains, three PACELC opinions:</p>
<ul>
  <li><strong>Bitcoin</strong>: CP under partition, EC otherwise. Strong eventual consistency through proof-of-work + longest chain. Latency is in tens of minutes by design.</li>
  <li><strong>Ethereum</strong> (post-Merge): CP under partition, EC otherwise. Proof-of-stake + Casper finality. Latency in seconds, deterministic finality after a few epochs.</li>
  <li><strong>Solana</strong>: leans AP under stress (occasional halts notwithstanding), EL otherwise. Single global leader at a time, very high throughput, occasional liveness loss when the leader misbehaves.</li>
</ul>`,
        },
        { kind: "heading", text: "The poster: no single machine knows everything" },
        { kind: "diagram", name: "distributed-truth-poster" },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the blockchain page",
          body: `The blockchain page builds Bitcoin from the inside out (blocks, mining, the chain). This page is the other half of the picture: Bitcoin from the outside in, as one example of the distributed-systems pattern. The two pages share the same gossip diagram for a reason: gossip is the bridge between them.`,
        },
        { kind: "heading", text: "Every previous topic, one click away" },
        {
          kind: "prose",
          html: `<p>This page synthesises material from across the site. If a callback above caught you flat-footed, the original is one click away:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x02 / binary",
              value: "Two states, one wire",
              desc: "Every packet between nodes is bytes; every byte is bits.",
              href: "/binary",
            },
            {
              label: "0x03 / ascii",
              value: "Protocols are conventions",
              desc: "Distributed systems agree on byte-level message formats; ASCII set the template.",
              href: "/ascii",
            },
            {
              label: "0x04 / logic gates",
              value: "Every router is gates",
              desc: "Every switch and NIC between two nodes is a circuit at the bottom.",
              href: "/logic-gates",
            },
            {
              label: "0x05 / cpu",
              value: "Every node is a CPU",
              desc: "Every participant is a fetch-decode-execute loop running protocol code.",
              href: "/cpu",
            },
            {
              label: "0x06 / memory",
              value: "Buffers, queues, mempool",
              desc: "Pending messages and protocol state all live in RAM on every node.",
              href: "/memory",
            },
            {
              label: "0x01 / number systems",
              value: "Addresses are numbers",
              desc: "IPv4, IPv6, node IDs, peer IDs: all integers, written in friendly notation.",
              href: "/number-systems",
            },
            {
              label: "0x07 / operating system",
              value: "Owns the sockets",
              desc: "Every distributed program is a process; sockets are the kernel boundary it uses.",
              href: "/operating-system",
            },
            {
              label: "0x09 / pointers",
              value: "Sockets are handles",
              desc: "A socket fd is the network's version of a pointer: a number that means somewhere.",
              href: "/pointers",
            },
            {
              label: "0x0B / arrays",
              value: "Packet payloads",
              desc: "Every message payload is a byte array; receive buffers are ring arrays.",
              href: "/arrays",
            },
            {
              label: "0x0C / linked lists",
              value: "Packet queues",
              desc: "Kernel send/recv queues are linked lists. So is the blockchain itself.",
              href: "/linked-list",
            },
            {
              label: "0x0D / hashing",
              value: "Consistent hashing, integrity, identity",
              desc: "Hash rings place data; cryptographic hashes prove identity and detect tampering.",
              href: "/hashing",
            },
            {
              label: "0x0F / networking",
              value: "The transport underneath",
              desc: "TCP/IP, routing, gossip overlays: the layer this page is built on.",
              href: "/networking",
            },
          ],
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Distributed systems is the deepest rabbit hole on the site. Pick any of these and you can spend years:</p>
<ul>
  <li><strong>Lamport's "Time, Clocks and the Ordering of Events"</strong> (1978). The paper that started rigorous distributed-systems thinking.</li>
  <li><strong>Paxos and Raft</strong>. The two canonical crash-fault-tolerant consensus algorithms. Raft was designed to be more teachable than Paxos; both are worth reading.</li>
  <li><strong>The PBFT paper</strong> (Castro & Liskov, 1999). The classic practical Byzantine algorithm; everything modern is a descendant.</li>
  <li><strong>HotStuff and the modern BFT line</strong>. Linear message complexity, chain-style consensus; the basis of Diem, Aptos, several proof-of-stake chains.</li>
  <li><strong>Designing Data-Intensive Applications</strong> (Kleppmann). Single best book on the everything of distributed databases.</li>
  <li><strong>The Raft demo at <code>raft.github.io</code></strong>. An interactive simulator; play with leader elections, partitions, and log replication.</li>
  <li><strong>Jepsen reports</strong> (jepsen.io). Aphyr's tests of real distributed databases under partition. Equal parts technical and entertaining.</li>
</ul>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x11",
    title: "You can only guarantee two. The silent tradeoff every system makes.",
    href: "/cap-theorem",
    label: "cap theorem",
    variant: "magenta",
  },
};
