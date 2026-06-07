import type { PageContent } from "@/types/content";

const rustCapTypes = `// The CAP tradeoff expressed as types.
// In a real system you choose your guarantees
// before you write a single line of logic.
enum CapChoice {
    // Strong consistency: may reject requests
    // during a partition to avoid stale data.
    ConsistencyOverAvailability,

    // Always available: may return stale data
    // during a partition to stay responsive.
    AvailabilityOverConsistency,
}

// A key-value read that respects the choice.
fn get_value(
    choice: &CapChoice,
    local_value: u64,
    can_reach_primary: bool,
    primary_value: u64,
) -> Option<u64> {
    match choice {
        // CP: refuse if we cannot verify the latest value.
        CapChoice::ConsistencyOverAvailability => {
            if can_reach_primary {
                Some(primary_value)
            } else {
                None // refuse rather than risk stale data
            }
        }
        // AP: return what we have, even if stale.
        CapChoice::AvailabilityOverConsistency => {
            Some(local_value) // always respond
        }
    }
}`;

const cCapTypes = `#include <stdint.h>

typedef enum {
    CAP_CONSISTENCY, // refuse requests if uncertain
    CAP_AVAILABILITY // always respond, may be stale
} CapChoice;

// Returns -1 if CP and a partition is detected.
int64_t get_value(
    CapChoice choice,
    int64_t local_value,
    int can_reach_primary,
    int64_t primary_value
) {
    if (choice == CAP_CONSISTENCY) {
        // CP: only answer if we can verify.
        return can_reach_primary ? primary_value : -1;
    } else {
        // AP: always answer, even if stale.
        return local_value;
    }
}`;

const rustReads = `use std::time::{Duration, Instant};

// A CP database read. Returns None if it cannot
// confirm the latest state across a quorum.
fn cp_read(
    node: &Node,
    key: &str,
    quorum_timeout: Duration,
) -> Option<String> {
    let responses = node.broadcast_read(key);
    let deadline = Instant::now() + quorum_timeout;

    let mut confirmations = 0;
    for response in responses {
        if Instant::now() > deadline {
            // Timeout: refuse rather than risk stale data.
            // This is the CP tradeoff in code.
            return None;
        }
        if response.is_ok() {
            confirmations += 1;
        }
    }

    if confirmations >= node.quorum_size() {
        Some(node.local_value(key))
    } else {
        None // CP: refuse if quorum not reached
    }
}

// An AP database read. Always returns something,
// even if it might be out of date.
fn ap_read(node: &Node, key: &str) -> String {
    node.local_value(key)
        .unwrap_or_else(|| "default".to_string())
}`;

const cReads = `#include <stdbool.h>
#include <time.h>

// CP read: blocks until quorum or timeout.
// Returns NULL if it cannot confirm consistency.
char* cp_read(Node* node, const char* key, int timeout_ms) {
    int confirmations = 0;
    clock_t start = clock();

    while (confirmations < node->quorum_size) {
        int elapsed = (clock() - start) * 1000 / CLOCKS_PER_SEC;
        if (elapsed > timeout_ms) {
            return NULL; // CP: refuse on timeout
        }
        if (poll_node(node, key)) {
            confirmations++;
        }
    }
    return node->local_value; // confirmed consistent
}

// AP read: always returns immediately.
// May be stale, will always respond.
char* ap_read(Node* node, const char* key) {
    return node->local_value ? node->local_value : "default";
}`;

const rustConsensus = `// Simplified Raft-style consensus check.
// Used by etcd, CockroachDB, and similar CP systems.
#[derive(Debug, PartialEq)]
enum ConsensusResult {
    Committed(String),    // majority agreed
    Pending,              // still gathering votes
    Rejected,             // could not reach quorum
}

fn check_consensus(
    votes: &[Option<String>],
    quorum: usize,
) -> ConsensusResult {
    let total = votes.len();
    let agreements: Vec<&String> = votes.iter().flatten().collect();

    if agreements.len() >= quorum {
        // Majority agreed on a value: this is how
        // CP systems commit a write.
        ConsensusResult::Committed(agreements[0].clone())
    } else if total - agreements.len() > total - quorum {
        // Too many nodes unreachable to ever reach quorum.
        // CP: reject rather than risk inconsistency.
        ConsensusResult::Rejected
    } else {
        ConsensusResult::Pending
    }
}

fn main() {
    // 5 nodes, need 3 for quorum.
    let votes = vec![
        Some("value_42".to_string()),
        Some("value_42".to_string()),
        Some("value_42".to_string()),
        None, // node unreachable
        None, // node unreachable
    ];

    match check_consensus(&votes, 3) {
        ConsensusResult::Committed(v) => println!("Committed: {}", v),
        ConsensusResult::Rejected => println!("Rejected: partition detected"),
        ConsensusResult::Pending => println!("Waiting for quorum..."),
    }
    // Output: Committed: value_42
}`;

const cConsensus = `#include <stdio.h>
#include <string.h>
#include <stddef.h>

typedef enum { COMMITTED, PENDING, REJECTED } ConsensusResult;

ConsensusResult check_consensus(
    const char** votes, // NULL = unreachable node
    size_t total,
    size_t quorum,
    char* out_value,
    size_t out_size
) {
    size_t agreements = 0;
    const char* agreed_value = NULL;

    for (size_t i = 0; i < total; i++) {
        if (votes[i] != NULL) {
            if (!agreed_value) agreed_value = votes[i];
            if (strcmp(votes[i], agreed_value) == 0) agreements++;
        }
    }

    if (agreements >= quorum) {
        if (out_value && agreed_value)
            strncpy(out_value, agreed_value, out_size);
        return COMMITTED;
    }

    size_t unreachable = total - agreements;
    if (unreachable > total - quorum) return REJECTED;
    return PENDING;
}

int main(void) {
    const char* votes[] = { "value_42", "value_42", "value_42", NULL, NULL };
    char result[64];
    ConsensusResult r = check_consensus(votes, 5, 3, result, sizeof(result));
    if (r == COMMITTED)      printf("Committed: %s\\n", result);
    else if (r == REJECTED)  printf("Rejected: partition detected\\n");
    else                     printf("Pending: waiting for quorum\\n");
    return 0;
}`;

export const capTheorem: PageContent = {
  slug: "cap-theorem",
  hexLabel: "0x11",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x11 / cap-theorem",
    title: `You can only<br><span class="highlight">guarantee two.</span>`,
    lede: `In 2000 a computer scientist proved that every distributed system makes a silent tradeoff. <strong>Consistency</strong>. <strong>Availability</strong>. <strong>Partition tolerance</strong>. Pick any two. This page is why that choice is unavoidable, and what every system you use quietly chose without telling you.`,
    narrativeHtml: `<p>You build a database. You run it on two machines instead of one, so that if a server dies the other keeps going.</p>
<p>Smart. Safe. Until the wire between them is cut.</p>
<p>Now you have two machines that cannot talk, and a customer standing in front of one of them asking for their balance.</p>
<p>You have exactly two choices, and both of them are bad.</p>
<p>Answer with the number you have, and risk it being wrong, the other machine may hold newer data you cant see.</p>
<p>Or refuse to answer until the wire is fixed, and leave the customer staring at a spinner.</p>
<p>Wrong, or unavailable. Pick one. There is no third door.</p>
<p>In 2000 a computer scientist named Eric Brewer proved this is not a bug you can engineer away. Its a law. Every distributed system youve ever used makes this exact tradeoff the moment the network splits.</p>
<p>Consistency. Availability. Partition tolerance. You can promise two. Never three.</p>
<p>On page sixteen you learned that no single machine knows everything. This is the price of that.</p>
<p>Lets meet the three promises.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The three **promises**",
      blocks: [
        {
          kind: "prose",
          html: `<p>His name was Eric Brewer. In 2000 he stood up at a conference and told the entire tech industry something they did not want to hear: you cannot have all three. Almost nobody believed him. Two years later, Gilbert and Lynch proved it formally.</p>
<p>Every database, app, and blockchain built since then has been forced to live with the consequences. This is not an engineering limitation. This is not a hardware problem. This is mathematics. And once it clicks, you will never look at a loading spinner the same way again.</p>`,
        },
        {
          kind: "prose",
          html: `<p>Every distributed system, every app, database, and blockchain that runs across multiple machines, makes three promises to its users. The CAP theorem says you can fully keep two of them. Never all three. Here is what they mean.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "C · consistency",
              value: "Every machine sees the same truth",
              desc: "Every read receives the most recent write. Every machine sees identical data at the same time. No stale reads, no contradictions, one reality, always. Example: your bank balance is $500 on every server simultaneously. No server can disagree.",
            },
            {
              label: "A · availability",
              value: "The system always responds",
              desc: "Every request receives a response. Not an error, not a timeout, not 'try again later'. An actual answer, always, even if that answer is slightly out of date. Example: the app loads instantly even if some servers are struggling.",
            },
            {
              label: "P · partition tolerance",
              value: "Survives when machines disconnect",
              desc: "The system keeps working even when the network between machines fails. Cables get cut, packets get dropped, data centres lose connectivity. The system continues anyway. Example: the app keeps working even when two data centres cannot talk to each other.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the theorem",
          body: `Brewer proved: during a network partition you can guarantee <strong>Consistency</strong> or you can guarantee <strong>Availability</strong>. Not both. Choose one. Partition tolerance is not optional in the real world, so the real choice is always C versus A.`,
        },
        { kind: "heading", text: "The tradeoff, expressed as types" },
        {
          kind: "prose",
          html: `<p>In a real system the choice is made in the architecture, before a single line of business logic. Here it is as a plain enum: a key-value read that either refuses (CP) or answers with possibly-stale data (AP).</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustCapTypes },
            c: { language: "c", code: cCapTypes },
          },
        },
        { kind: "heading", text: "Try it: cut the network yourself" },
        {
          kind: "prose",
          html: `<p>This is the whole theorem in one widget. Two data centres holding the same $500 balance. Cut the network between them, choose your guarantee, and try to withdraw money from both sides at once. Watch what each choice costs you.</p>`,
        },
        { kind: "widget", name: "cap-visualiser" },
        {
          kind: "callout",
          variant: "warn",
          title: "// what you just saw",
          body: `Under CP, the partition makes both servers refuse: your money is safe but the system is down. Under AP, both servers keep taking withdrawals and silently diverge; if the two sides together hand out more than the balance, you have created money out of nothing. That second case is the double-spend problem, and it is exactly why financial systems pick CP.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "What every system **actually chose**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Every system you use every day has already made this choice. Silently. In the architecture. Before you signed up. Here is what they chose and why.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "CP · your bank",
              value: "Money requires truth",
              desc: "Banks would rather go offline than let two servers disagree about your money. A partition triggers a freeze; transactions wait until consistency is restored. You have felt this: every time online banking just stops working at the worst possible moment. That outage screen is the bank protecting reality itself.",
            },
            {
              label: "AP · Google Docs",
              value: "Collaboration over sync",
              desc: "You and a colleague edit simultaneously. Google does not freeze the world; it allows temporary inconsistency, then reconciles the edits afterward. You have felt this: the moment two edits conflict and Google asks you which version to keep.",
            },
            {
              label: "AP · WhatsApp",
              value: "Messages over order",
              desc: "You land after a flight, turn aeroplane mode off, and fifty messages arrive at once, some out of order, some hours old. WhatsApp tolerated inconsistency until synchronisation became possible. You have felt this: messages arriving after the conversation they belonged to already ended.",
            },
            {
              label: "AP · Netflix",
              value: "Uptime over accuracy",
              desc: "A data centre fails and Netflix keeps streaming. Recommendations might be briefly wrong, watch history might update late. Slightly wrong data beats fifty million spinning wheels. You have felt this: a show you already watched showing as unwatched for a few minutes.",
            },
            {
              label: "CP · Bitcoin",
              value: "Trust requires proof",
              desc: "Every node must agree on the same ledger, always, no exceptions. If consensus is uncertain, parts of the network slow down rather than risk conflicting histories, because with money there is no reconciling later. You have felt this: waiting ten minutes for a confirmation. That wait is the price of mathematical truth in a trustless network.",
            },
          ],
        },
        { kind: "heading", text: "The choices, side by side" },
        {
          kind: "table",
          headers: ["system", "choice", "sacrifices", "why"],
          rows: [
            ["Your Bank", "<strong>CP</strong>", "Availability", "Money requires truth"],
            ["Google Docs", "<strong>AP</strong>", "Consistency", "Collaboration &gt; sync"],
            ["WhatsApp", "<strong>AP</strong>", "Consistency", "Messages &gt; order"],
            ["Netflix", "<strong>AP</strong>", "Consistency", "Uptime &gt; accuracy"],
            ["Bitcoin", "<strong>CP</strong>", "Availability", "Trust requires proof"],
            ["HBase", "<strong>CP</strong>", "Availability", "Analytics &gt; uptime"],
            ["DynamoDB", "<strong>AP</strong>", "Consistency", "Scale &gt; accuracy"],
            ["Cassandra", "<strong>AP</strong>", "Consistency", "Always available"],
          ],
        },
        { kind: "heading", text: "CP and AP reads, in code" },
        {
          kind: "prose",
          html: `<p>The difference between CP and AP is not a config flag; it is the shape of the read path. A CP read waits for a quorum and refuses if it cannot get one. An AP read answers immediately from local state and never blocks.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustReads },
            c: { language: "c", code: cReads },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the tell",
          body: `Look for the early <code>return None</code> / <code>return NULL</code> on timeout. That single line is a system declaring itself CP: it would rather give you nothing than give you something wrong. An AP system has no such line; it always has an answer ready.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Beyond CAP: **PACELC** and real-world nuance",
      blocks: [
        {
          kind: "prose",
          html: `<p>CAP tells you what happens when the network breaks. But networks break rarely. What about the other 99.9% of the time? <strong>PACELC</strong> answers that.</p>
<p>PACELC extends CAP with one insight: even when there is no partition, you still face a tradeoff.</p>
<ul>
  <li><strong>If Partition (P)</strong>: choose Availability (A) or Consistency (C). This is plain CAP.</li>
  <li><strong>Else (E)</strong>, in normal operation: choose Latency (L) or Consistency (C).</li>
</ul>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">network partition?<br>├── YES → Availability vs Consistency&nbsp;&nbsp;(the CAP tradeoff)<br>└── NO&nbsp;&nbsp;→ Latency vs Consistency&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(the PACELC tradeoff)</p>`,
        },
        {
          kind: "prose",
          html: `<p>The second tradeoff is the one you live with most of the time. Fast response or guaranteed correctness, on every single request, every single second. A system that double-checks every read with a quorum is correct but slow; a system that answers from the nearest replica is fast but can be briefly wrong.</p>`,
        },
        {
          kind: "table",
          headers: ["system", "partition", "normal", "meaning"],
          rows: [
            ["DynamoDB", "PA", "EL", "Fast always, eventually consistent"],
            ["Cassandra", "PA", "EL", "Available, tunable consistency"],
            ["HBase", "PC", "EC", "Consistent, pay the latency cost"],
            ["MySQL", "PC", "EC", "ACID, slower writes"],
            ["Bitcoin", "PC", "EC", "Truth costs time"],
          ],
        },
        { kind: "heading", text: "Consensus in code: the heart of every CP system" },
        {
          kind: "prose",
          html: `<p>How does a CP system actually decide a value is safe to commit? It collects votes from its nodes and commits only when a majority (a <em>quorum</em>) agrees. Below is a simplified version of the check at the core of Raft, the algorithm behind etcd and CockroachDB.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustConsensus },
            c: { language: "c", code: cConsensus },
          },
        },
        { kind: "heading", text: "Bitcoin and the CAP theorem" },
        {
          kind: "prose",
          html: `<p>Bitcoin is the most famous CP system ever built. Consistency above everything. Every node must agree on the same ledger. No exceptions, no stale reads, no temporary inconsistency that reconciles later.</p>
<p>The double-spend problem is just the CAP theorem applied to a financial ledger. If two nodes accept the same Bitcoin in two different transactions simultaneously, the ledger is inconsistent and someone gets money they should not have. That is the exact failure the AP path in the widget above produced.</p>
<p>Satoshi solved it with <strong>Proof of Work</strong>. Instead of a central authority deciding which transaction is valid, every node independently runs the same algorithm and the longest valid chain wins. Not because someone decided, but because every node applies the same rule. This is consensus without coordination: consistency without a coordinator, the CAP theorem solved using computation as the arbiter.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">// Bitcoin's CAP choice, in pseudocode<br>if cannot_reach_consensus() {<br>&nbsp;&nbsp;&nbsp;&nbsp;halt_new_blocks();&nbsp;&nbsp;&nbsp;&nbsp;// go offline<br>&nbsp;&nbsp;&nbsp;&nbsp;// never serve stale state<br>&nbsp;&nbsp;&nbsp;&nbsp;// consistency is non-negotiable<br>&nbsp;&nbsp;&nbsp;&nbsp;// availability is the sacrifice<br>}</p>`,
        },
        {
          kind: "prose",
          html: `<p>This is why you wait for confirmations. This is why Bitcoin is slow. This is why it has never been successfully double-spent in over fifteen years. Every second of waiting is the price of consistency in a trustless world.</p>`,
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "distributed-systems",
        text: `CAP is the headline theorem of distributed systems. The distributed-systems page is the world; this page is the law that world obeys.`,
      },
      {
        slug: "pacelc",
        text: `PACELC starts where CAP stops. CAP covers the partition; PACELC adds the latency-versus-consistency choice you make even when the network is fine. The pacelc page is the sequel.`,
      },
      {
        slug: "networking",
        text: `CAP only bites because networks partition. Packets get lost, links go down. The networking page is why the P in CAP is not optional.`,
      },
      {
        slug: "blockchain",
        text: `Bitcoin answers CAP by choosing consistency and paying for it with ten-minute waits. The blockchain page is CAP turned into a design decision.`,
      },
      {
        slug: "nodes",
        text: `CAP is about agreement among nodes that cannot all reach each other. The nodes page is who is trying to agree.`,
      },
      {
        slug: "hashing",
        text: `Distributed databases use consistent hashing to spread data across nodes, and CAP decides what happens to that data during a partition. The hashing page places the keys; this page is what breaks when the network does.`,
      },
      {
        slug: "binary",
        text: `Every value a distributed system stores is ultimately binary, so disagreement is two servers holding different bits at the same logical address. The binary page is what the conflict is made of.`,
      },
      {
        slug: "memory",
        text: `CAP is a memory problem at heart: two machines, two copies, one truth, impossible to keep aligned when the link between them fails. The memory page is the copies it splits.`,
      },
      {
        slug: "linked-list",
        text: `A blockchain is a linked list whose pointers are hashes, so tampering with any node is detectable by every other. The linked-list page is consistency made structural.`,
      },
      {
        slug: "arrays",
        text: `Distributed arrays are called shards, and CAP decides whether they must all agree before responding or each can answer alone. The arrays page is the structure being split.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x12",
    title: "CAP told you what breaks. PACELC tells you what you choose every second.",
    href: "/pacelc",
    label: "pacelc",
    variant: "magenta",
  },
};
