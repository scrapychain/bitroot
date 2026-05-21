import type { PageContent } from "@/types/content";

const rustPacelcTypes = `// PACELC expressed as a type system.
// Every read operation implicitly makes this choice.
#[derive(Debug)]
enum PacelcRead {
    // EL: answer fast, tolerate staleness
    LowLatency { max_staleness_ms: u64 },
    // EC: answer correct, pay the latency cost
    StrongConsistency { require_quorum: bool },
}

fn read_balance(
    strategy: &PacelcRead,
    local_cache: u64,
    local_age_ms: u64,
    fetch_from_primary: impl Fn() -> u64,
) -> u64 {
    match strategy {
        // EL: return local value if fresh enough
        PacelcRead::LowLatency { max_staleness_ms } => {
            if local_age_ms <= *max_staleness_ms {
                local_cache // fast, possibly stale
            } else {
                fetch_from_primary() // cache expired
            }
        }
        // EC: always fetch from primary
        PacelcRead::StrongConsistency { .. } => {
            fetch_from_primary() // slow, always correct
        }
    }
}

fn main() {
    let el = PacelcRead::LowLatency { max_staleness_ms: 100 };
    let ec = PacelcRead::StrongConsistency { require_quorum: true };

    // EL: returns cache if < 100ms old. Fast. Instagram does this.
    let _ = read_balance(&el, 500, 50, || 500);

    // EC: always goes to primary. Correct. Banks do this.
    let _ = read_balance(&ec, 500, 50, || 500);
}`;

const cPacelcTypes = `#include <stdint.h>
#include <stdbool.h>

typedef enum {
    PACELC_EL, // low latency, tolerate staleness
    PACELC_EC  // strong consistency, pay latency
} PacelcStrategy;

typedef struct {
    uint64_t value;
    uint64_t age_ms;
} CachedValue;

typedef uint64_t (*FetchPrimary)(void);

uint64_t read_balance(
    PacelcStrategy strategy,
    CachedValue cache,
    uint64_t max_staleness_ms,
    FetchPrimary fetch
) {
    switch (strategy) {
        case PACELC_EL:
            // EL: use cache if fresh enough
            if (cache.age_ms <= max_staleness_ms) {
                return cache.value; // fast, maybe stale
            }
            return fetch(); // cache expired, go remote
        case PACELC_EC:
            // EC: always go to primary
            return fetch(); // slow, always correct
        default:
            return fetch();
    }
}`;

const rustTunable = `use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
enum ConsistencyLevel {
    One,    // EL: fastest, least consistent
    Quorum, // balanced: majority must agree
    All,    // EC: slowest, most consistent
}

struct DistributedKV {
    nodes: Vec<HashMap<String, u64>>,
}

impl DistributedKV {
    fn read(&self, key: &str, level: ConsistencyLevel) -> Option<u64> {
        let responses: Vec<Option<u64>> = self
            .nodes
            .iter()
            .map(|node| node.get(key).copied())
            .collect();

        match level {
            // EL: return first available response. Fast, may be stale.
            ConsistencyLevel::One => responses.iter().flatten().next().copied(),

            // Balanced: a majority must agree.
            ConsistencyLevel::Quorum => {
                let quorum = self.nodes.len() / 2 + 1;
                let mut counts: HashMap<u64, usize> = HashMap::new();
                for val in responses.iter().flatten() {
                    *counts.entry(*val).or_insert(0) += 1;
                }
                counts
                    .into_iter()
                    .find(|(_, count)| *count >= quorum)
                    .map(|(val, _)| val)
            }

            // EC: ALL nodes must agree. Slowest, most consistent.
            ConsistencyLevel::All => {
                let values: Vec<u64> = responses.iter().flatten().copied().collect();
                if values.len() == self.nodes.len()
                    && values.windows(2).all(|w| w[0] == w[1])
                {
                    values.first().copied()
                } else {
                    None // nodes disagree: refuse
                }
            }
        }
    }
}

fn main() {
    let db = DistributedKV {
        nodes: vec![
            [("balance".to_string(), 500)].into(),
            [("balance".to_string(), 500)].into(),
            [("balance".to_string(), 495)].into(), // stale
        ],
    };

    println!("{:?}", db.read("balance", ConsistencyLevel::One));    // Some(500)
    println!("{:?}", db.read("balance", ConsistencyLevel::Quorum)); // Some(500)
    println!("{:?}", db.read("balance", ConsistencyLevel::All));    // None
}`;

const cTunable = `#include <stdio.h>
#include <stdint.h>
#include <stddef.h>

typedef enum {
    CONSISTENCY_ONE,    // EL: fastest
    CONSISTENCY_QUORUM, // balanced
    CONSISTENCY_ALL     // EC: most consistent
} ConsistencyLevel;

// Returns -1 if consistency cannot be guaranteed.
int64_t distributed_read(
    const int64_t *node_values, // -1 = unreachable
    size_t node_count,
    ConsistencyLevel level
) {
    size_t quorum = node_count / 2 + 1;
    size_t reachable = 0, agreements = 0;
    int64_t first_value = -1;

    for (size_t i = 0; i < node_count; i++) {
        if (node_values[i] < 0) continue;
        reachable++;
        if (first_value < 0) first_value = node_values[i];
        if (node_values[i] == first_value) agreements++;
    }

    switch (level) {
        case CONSISTENCY_ONE:
            return first_value; // EL: first wins
        case CONSISTENCY_QUORUM:
            return (agreements >= quorum) ? first_value : -1;
        case CONSISTENCY_ALL:
            return (reachable == node_count && agreements == node_count)
                   ? first_value : -1;
    }
    return -1;
}

int main(void) {
    int64_t nodes[] = {500, 500, 495}; // two agree, one stale
    printf("ONE:    %lld\\n", distributed_read(nodes, 3, CONSISTENCY_ONE));    // 500
    printf("QUORUM: %lld\\n", distributed_read(nodes, 3, CONSISTENCY_QUORUM)); // 500
    printf("ALL:    %lld\\n", distributed_read(nodes, 3, CONSISTENCY_ALL));    // -1
    return 0;
}`;

const rustSwr = `use std::time::{Duration, Instant};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct Cache<T: Clone> {
    value: T,
    fetched_at: Instant,
    ttl: Duration,
}

// PA/EL: stale-while-revalidate.
// Returns immediately, refreshes in the background.
fn el_read<T: Clone + Send + 'static>(
    cache: Arc<Mutex<Cache<T>>>,
    fetch: impl Fn() -> T + Send + 'static,
) -> T {
    let cached = cache.lock().unwrap();
    if cached.fetched_at.elapsed() > cached.ttl {
        // Stale: trigger a background refresh, but do not wait.
        let cache_clone = Arc::clone(&cache);
        std::thread::spawn(move || {
            let fresh = fetch();
            let mut c = cache_clone.lock().unwrap();
            c.value = fresh;
            c.fetched_at = Instant::now();
        });
    }
    cached.value.clone() // EL: fast, possibly stale
}

// PC/EC: always consistent.
// Blocks until fresh data is fetched.
fn ec_read<T: Clone>(
    cache: Arc<Mutex<Cache<T>>>,
    fetch: impl Fn() -> T,
) -> T {
    let mut cached = cache.lock().unwrap();
    if cached.fetched_at.elapsed() > cached.ttl {
        cached.value = fetch(); // EC: slow, always correct
        cached.fetched_at = Instant::now();
    }
    cached.value.clone()
}`;

const cSwr = `#include <time.h>
#include <stdbool.h>
#include <stdint.h>
#include <pthread.h>

typedef struct {
    uint64_t        value;
    time_t          fetched_at;
    int             ttl_seconds;
    pthread_mutex_t lock;
} Cache;

typedef uint64_t (*FetchFn)(void);

// PA/EL: return immediately, refresh in the background.
uint64_t el_read(Cache *cache, FetchFn fetch) {
    pthread_mutex_lock(&cache->lock);
    uint64_t result = cache->value;
    bool stale = difftime(time(NULL), cache->fetched_at) > cache->ttl_seconds;
    pthread_mutex_unlock(&cache->lock);

    if (stale) {
        // Simplified: real code hands this to a thread pool.
        uint64_t fresh = fetch();
        pthread_mutex_lock(&cache->lock);
        cache->value = fresh;
        cache->fetched_at = time(NULL);
        pthread_mutex_unlock(&cache->lock);
    }
    return result; // EL: return before the refresh completes
}

// PC/EC: block until fresh.
uint64_t ec_read(Cache *cache, FetchFn fetch) {
    pthread_mutex_lock(&cache->lock);
    if (difftime(time(NULL), cache->fetched_at) > cache->ttl_seconds) {
        cache->value = fetch(); // EC: block and fetch fresh data
        cache->fetched_at = time(NULL);
    }
    uint64_t result = cache->value;
    pthread_mutex_unlock(&cache->lock);
    return result; // EC: always current
}`;

export const pacelc: PageContent = {
  slug: "pacelc",
  hexLabel: "0x12",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x12 / pacelc",
    title: `CAP told you what breaks.<br><span class="highlight">PACELC tells you what you choose every second.</span>`,
    lede: `The CAP theorem only applies during a disaster. Partitions happen maybe twelve times a year. PACELC covers the other 525,948 minutes: the tradeoff that never stops, even when everything is working perfectly.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "The two **tradeoffs**",
      blocks: [
        {
          kind: "prose",
          html: `<p>You learned the CAP theorem. Consistency, availability, partition tolerance: pick two. And you felt smart. Then someone asked: but what about when the network <em>isn't</em> broken? CAP had nothing to say, because CAP only describes disasters, and partitions are rare.</p>
<p>But every single request that hits your system when everything is working fine still faces a choice: <strong>speed or correctness</strong>.</p>
<p>In 2012 a computer scientist named Daniel Abadi looked at the CAP theorem and said: Brewer was right, but he only told half the story. So he extended it. If there is a <strong>Partition</strong>, choose between Availability and Consistency. <strong>Else</strong>, when everything is normal, choose between Latency and Consistency. Four letters: PA/EL or PC/EC. The most honest description of every database ever built. Once you see it, you find it everywhere: in your own code, in every system you have ever used, every day of your career.</p>`,
        },
        {
          kind: "prose",
          html: `<p>CAP describes what happens when your network breaks. PACELC extends it with a second question: what happens the rest of the time? Even during perfect network conditions, every distributed system still chooses between speed and correctness on every single request.</p>`,
        },
        { kind: "heading", text: "The PACELC decision tree" },
        {
          kind: "raw",
          html: `<p class="formula-block">network partition detected?<br>├── YES → CAP applies<br>│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;choose: Availability (A)&nbsp;&nbsp;or&nbsp;&nbsp;Consistency (C)<br>│<br>└── NO&nbsp;&nbsp;→ Else (E) applies<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;choose: Latency (L)&nbsp;&nbsp;"answer fast, maybe stale"<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;or&nbsp;Consistency (C)&nbsp;&nbsp;"answer correct, takes longer"</p>`,
        },
        { kind: "heading", text: "The four labels" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "PA",
              value: "Available during partition",
              desc: "When the network splits, keep answering. Stay online even if the two halves drift apart. The CAP A.",
            },
            {
              label: "PC",
              value: "Consistent during partition",
              desc: "When the network splits, refuse rather than diverge. Go offline rather than serve a value you cannot verify. The CAP C.",
            },
            {
              label: "EL",
              value: "Low latency in normal ops",
              desc: "No partition, healthy network: answer as fast as possible from the nearest replica, even if it is slightly behind.",
            },
            {
              label: "EC",
              value: "Consistent in normal ops",
              desc: "No partition, healthy network: still verify with the primary or a quorum before answering. Correct, but slower.",
            },
          ],
        },
        { kind: "heading", text: "The balance query, two ways" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "EL · low latency",
              value: "Fast, possibly stale",
              desc: "Answer immediately. Return the nearest server's value, maybe 1 millisecond. But that value might be 50 milliseconds out of date.",
            },
            {
              label: "EC · consistent",
              value: "Slow, always correct",
              desc: "Check with the primary first. Verify the latest value. Return the confirmed answer, 50 to 100 milliseconds. Slow, but always right.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the else clause",
          body: `Networks rarely partition. But every request chooses EL or EC. Every time, without exception. The "else" clause is the one you live inside every second your system is healthy, which is almost always.`,
        },
        { kind: "heading", text: "The choice, expressed as types" },
        {
          kind: "prose",
          html: `<p>Like the CAP page, the choice is structural. A read either returns a possibly-stale local value (EL) or pays to verify with the primary (EC).</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustPacelcTypes },
            c: { language: "c", code: cPacelcTypes },
          },
        },
        { kind: "heading", text: "Feel it: send a read under each strategy" },
        {
          kind: "prose",
          html: `<p>Same setup as the CAP visualiser, no partition this time. A primary and a nearby replica. Update the primary so the replica falls behind, then send reads under EL and EC and watch the latency-versus-correctness tradeoff happen in milliseconds.</p>`,
        },
        { kind: "widget", name: "pacelc-simulator" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "What every system **actually chose**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Every database, every distributed system, every blockchain has a PACELC label: four letters that describe its entire design philosophy. Here is what the most important ones chose, and why.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "PA/EL · DynamoDB",
              value: "Sacrifices correctness",
              desc: "Amazon's flagship database. During a partition it stays available; in normal ops it optimises for speed, returning the nearest server's value instantly even if slightly behind. You have felt this: Amazon showing an item in stock when it just sold out. The system prioritised your experience over perfect inventory accuracy.",
            },
            {
              label: "PC/EC · HBase",
              value: "Sacrifices speed",
              desc: "Apache's big-data database. During a partition it stays consistent; in normal ops it pays the latency cost. Every read goes to the primary, every write is confirmed before returning. You have felt this: a bank transfer that takes a few seconds. The system is verifying with every relevant server before telling you yes.",
            },
            {
              label: "PA/EL* · Cassandra",
              value: "Sacrifice depends on the query",
              desc: "The most flexible choice. Default: optimise for speed. Tunable per query: ONE reads from one node (fastest), QUORUM from a majority (balanced), ALL from every node (slowest, correct). You have felt this: Instagram loading your feed instantly while your follower count updates slowly. Same database, different consistency levels per operation.",
            },
            {
              label: "PC/EC · MySQL",
              value: "Sacrifices scale",
              desc: "The classic relational database. Every write confirmed before response, every read consistent. Slower than distributed alternatives, but correct, always. You have felt this: a form submission that takes a noticeable moment to confirm. The database is making sure your data is durably stored before telling you it worked.",
            },
            {
              label: "PC/EC ∞ · Bitcoin",
              value: "Sacrifices speed, always",
              desc: "The most extreme consistency any system has ever chosen. During a partition it halts rather than diverge; in normal ops, ten-minute confirmations. Bitcoin made the latency a feature: waiting is the proof of consistency. You have felt this: waiting ten minutes for a confirmation. That is not a bug. That is the price of absolute truth in a network with no central authority.",
            },
            {
              label: "PA/EL ⚡ · Solana",
              value: "Sacrifices fault tolerance under load",
              desc: "The opposite of Bitcoin. Optimises latency as aggressively as Bitcoin optimises consistency. Proof of History is a cryptographic clock that lets nodes agree on ordering without waiting for each other. 400ms confirmations versus Bitcoin's 10 minutes, 1500 times faster. You have felt this: Solana outages that Bitcoin has never had. Push EL to the physical limit and consistency becomes fragile under stress.",
            },
            {
              label: "PC/EC → · Ethereum",
              value: "Sacrifices speed, intentionally",
              desc: "Started closer to availability; Proof of Stake moved it toward consistency, with deterministic finality after two epochs (about 12 minutes). Moving up the PACELC spectrum deliberately, because DeFi requires it: a financial contract that can be reversed is not a financial contract. You have felt this: ETH transfers that take longer than Solana but feel more final. The system is choosing certainty over speed.",
            },
          ],
        },
        { kind: "heading", text: "The labels, side by side" },
        {
          kind: "table",
          headers: ["system", "partition", "normal", "speed", "correctness"],
          rows: [
            ["DynamoDB", "PA", "EL", "★★★★★", "★★★"],
            ["HBase", "PC", "EC", "★★★", "★★★★★"],
            ["Cassandra", "PA*", "EL*", "★★★★", "★★★★"],
            ["MySQL", "PC", "EC", "★★★", "★★★★★"],
            ["Bitcoin", "PC", "EC", "★", "★★★★★"],
            ["Solana", "PA", "EL", "★★★★★", "★★★"],
            ["Ethereum", "PC", "EC", "★★★", "★★★★★"],
          ],
        },
        { kind: "heading", text: "Tunable consistency, like Cassandra" },
        {
          kind: "prose",
          html: `<p>The most flexible systems let you pick the PACELC tradeoff <em>per query</em>. ONE is EL (fast, may be stale), ALL is EC (slow, refuses if nodes disagree), QUORUM sits in between. Same database, different point on the spectrum for every read.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTunable },
            c: { language: "c", code: cTunable },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// one database, many tradeoffs",
          body: `The <code>ALL</code> path returning <code>None</code> / <code>-1</code> when nodes disagree is EC in its purest form: it would rather refuse than hand back a value it cannot fully verify. The <code>ONE</code> path never refuses. Same code, same data, opposite ends of the PACELC spectrum, chosen at call time.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "PACELC in **your own code**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Most developers think PACELC is a database concern. It isn't. You make PACELC decisions in every codebase you touch, every day, without knowing it.</p>`,
        },
        { kind: "heading", text: "You have been doing this all along" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "PA/EL",
              value: "Cache an API response",
              desc: "You cache an API response for 60 seconds and return it to the next 1000 users without re-fetching. Fast, possibly stale.",
            },
            {
              label: "PC/EC",
              value: "Loading spinner before render",
              desc: "You show a loading spinner while fetching the latest data before rendering the page. Correct, slower.",
            },
            {
              label: "PA/EL",
              value: "Stale-while-revalidate",
              desc: "You show a stale value immediately and refresh it in the background. Fast perceived load, eventually consistent.",
            },
            {
              label: "PC/EC",
              value: "Wait for the confirmation email",
              desc: "You make the user wait for a confirmation email before letting them proceed. Correct, higher friction.",
            },
            {
              label: "PA/EL",
              value: "Offline-first app",
              desc: "Your app works offline using a local database that syncs when reconnected. Available always, consistent eventually.",
            },
            {
              label: "the realisation",
              value: "You already knew this",
              desc: "You have been making PACELC decisions every day of your career. You just did not have a name for it. Now you do.",
            },
          ],
        },
        { kind: "heading", text: "Stale-while-revalidate vs always-fresh" },
        {
          kind: "prose",
          html: `<p>The two most common PACELC patterns in application code, side by side. <code>el_read</code> returns instantly and refreshes in the background; <code>ec_read</code> blocks until the data is fresh. The difference is one <code>spawn</code> versus one blocking call.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustSwr },
            c: { language: "c", code: cSwr },
          },
        },
        { kind: "heading", text: "PACELC across the blockchain ecosystem" },
        {
          kind: "prose",
          html: `<p>Every blockchain is a PACELC opinion. Read the four letters and you understand the entire design.</p>
<ul>
  <li><strong>Bitcoin (PC/EC)</strong>: consistency above everything. Every transaction waits for global consensus across ten thousand nodes, ten minutes per block. The latency is the proof. No shortcut, no exception, no stale reads.</li>
  <li><strong>Ethereum (PC/EC, strengthening)</strong>: started with longer finality windows; Proof of Stake introduced deterministic finality after two epochs (about twelve minutes). Moving deliberately toward stronger consistency because DeFi contracts cannot tolerate reversal.</li>
  <li><strong>Solana (PA/EL)</strong>: Proof of History provides a cryptographic clock, so nodes agree on ordering without waiting for each other. 400ms confirmations, 1500x faster than Bitcoin. The tradeoff: outages Bitcoin has never had. Optimise EL to the physical limit and partition tolerance weakens under load.</li>
  <li><strong>Sui and Aptos (hybrid)</strong>: simple transfers go PA/EL, skipping global consensus to settle in under a second; complex transactions go PC/EC, requiring global agreement and taking longer but always correct. The most nuanced PACELC answer yet: a different tradeoff per operation type.</li>
</ul>`,
        },
        {
          kind: "raw",
          html: `<p class="formula-block">// PACELC as a design tool<br>// Ask this about every system you build:<br>//<br>// IF partition:<br>//&nbsp;&nbsp;&nbsp;choose A (stay online, risk divergence)<br>//&nbsp;&nbsp;&nbsp;or&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C (go offline, guarantee truth)<br>//<br>// ELSE normal operation:<br>//&nbsp;&nbsp;&nbsp;choose L (answer fast, risk staleness)<br>//&nbsp;&nbsp;&nbsp;or&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C (answer correct, pay latency)<br>//<br>// Your answer defines your architecture.<br>// Everything else follows from it.</p>`,
        },
        { kind: "heading", text: "Where PACELC appears in BitRoot" },
        {
          kind: "prose",
          html: `<p>The latency-versus-consistency tradeoff is not unique to databases. It shows up at every layer of the stack:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x06 / memory",
              value: "Your cache is PACELC",
              desc: "L1 cache is PA/EL: fast, possibly stale. RAM is PC/EC: slower, always consistent. Your CPU makes this tradeoff billions of times per second inside your own machine.",
              href: "/memory",
            },
            {
              label: "0x0F / networking",
              value: "Latency is physics",
              desc: "London to Tokyo is 250ms at the speed of light. PACELC is why distributed systems are fundamentally constrained by geography. The else clause is a physics problem.",
              href: "/networking",
            },
            {
              label: "0x09 / pointers",
              value: "A remote reference",
              desc: "A pointer to a value on another machine is a distributed reference. Following it means choosing: read the local cache (EL) or go to the source (EC). Every RPC is a PACELC decision.",
              href: "/pointers",
            },
            {
              label: "0x0B / arrays",
              value: "Sharded reads",
              desc: "A distributed array sharded across five machines. Reading element 42 from the nearest shard is EL; verifying with the primary is EC. The data structure and the theorem are inseparable.",
              href: "/arrays",
            },
            {
              label: "0x0D / hashing",
              value: "EC paid up front",
              desc: "Blockchains pay the EC latency cost at write time using hashing. A block hash is computed once, verified in nanoseconds. Slow to produce, instant to confirm: the PC/EC tradeoff optimised.",
              href: "/hashing",
            },
            {
              label: "0x11 / cap theorem",
              value: "The half before this",
              desc: "PACELC extends CAP. CAP covers the P case: partition. PACELC adds the E case: normal operation. CAP told you what breaks; PACELC tells you what you choose every other second.",
              href: "/cap-theorem",
            },
            {
              label: "0x10 / distributed systems",
              value: "Every decision is PACELC",
              desc: "Every architectural decision in a distributed system is ultimately a PACELC choice. Replication strategy: PA or PC. Read path: EL or EC. Four letters, the entire philosophy.",
              href: "/distributed-systems",
            },
            {
              label: "0x13 / blockchain",
              value: "A public declaration",
              desc: "Bitcoin: PC/EC, ten minutes, absolute truth. Ethereum: PC/EC, twelve minutes, DeFi safe. Solana: PA/EL, 400ms, accept the outages. Every chain is a public PACELC declaration.",
              href: "/blockchain",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x13",
    title: "The system that chose PC/EC above everything: how Bitcoin actually works.",
    href: "/blockchain",
    label: "blockchain",
    variant: "magenta",
  },
};
