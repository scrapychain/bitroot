import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: two graph representations. Rust uses HashMap and Vec from
 * std::collections; C builds the classic array-of-linked-lists by hand.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Representation 1: Adjacency List.
// Best for sparse graphs (most real-world graphs).
// Space: O(V + E) where V=nodes, E=edges.
// Edge lookup: O(degree). Scan the list.
// Neighbour iteration: O(degree). Fast.
use std::collections::HashMap;

struct Graph {
    // node id -> list of (neighbour id, weight)
    adjacency: HashMap<u32, Vec<(u32, u32)>>,
}

impl Graph {
    fn new() -> Self {
        Graph { adjacency: HashMap::new() }
    }

    fn add_edge(&mut self, from: u32, to: u32, weight: u32) {
        self.adjacency.entry(from).or_default()
            .push((to, weight));
        // for undirected: also add reverse edge
        // self.adjacency.entry(to).or_default()
        //     .push((from, weight));
    }

    fn neighbours(&self, node: u32) -> &[(u32, u32)] {
        self.adjacency.get(&node)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }
}

// Representation 2: Adjacency Matrix.
// Best for dense graphs or when edge lookup must be O(1).
// Space: O(V^2). Expensive for large sparse graphs.
// Edge lookup: O(1). Just check matrix[from][to].
struct DenseGraph {
    // matrix[i][j] = Some(weight) if edge exists
    matrix: Vec<Vec<Option<u32>>>,
    size:   usize,
}

impl DenseGraph {
    fn new(size: usize) -> Self {
        DenseGraph {
            matrix: vec![vec![None; size]; size],
            size,
        }
    }

    fn add_edge(&mut self, from: usize,
                to: usize, weight: u32) {
        self.matrix[from][to] = Some(weight);
    }

    fn has_edge(&self, from: usize, to: usize) -> bool {
        self.matrix[from][to].is_some()
        // O(1). Always.
    }
}`;

const cBeginner = `/*
 * Adjacency list in C.
 * Each node stores a linked list of edges.
 * Classic C graph representation.
 */
#include <stdlib.h>
#include <stdint.h>

typedef struct Edge {
    uint32_t    to;
    uint32_t    weight;
    struct Edge *next;  /* linked list of edges */
} Edge;

typedef struct {
    Edge   **heads; /* heads[i] = first edge from node i */
    uint32_t n;     /* number of nodes */
} Graph;

Graph *graph_new(uint32_t n) {
    Graph *g  = malloc(sizeof *g);
    g->heads  = calloc(n, sizeof *g->heads);
    g->n      = n;
    return g;
    /* heads[i] = NULL initially (no edges) */
}

void graph_add_edge(Graph *g, uint32_t from,
                    uint32_t to, uint32_t weight) {
    Edge *e = malloc(sizeof *e);
    e->to     = to;
    e->weight = weight;
    e->next   = g->heads[from]; /* prepend */
    g->heads[from] = e;
    /* O(1) insert at head of linked list */
    /* for undirected: also add reverse edge */
}

void graph_free(Graph *g) {
    for (uint32_t i = 0; i < g->n; i++) {
        Edge *e = g->heads[i];
        while (e) { Edge *next = e->next; free(e); e = next; }
    }
    free(g->heads);
    free(g);
    /* C: you manage every allocation.
     * Rust: Graph and its Vecs drop automatically. */
}

/*
 * Adjacency matrix in C.
 * matrix[i * n + j] = weight, 0 = no edge.
 * O(1) edge lookup. O(n^2) space.
 */
typedef struct {
    uint32_t *matrix;
    uint32_t  n;
} DenseGraph;

DenseGraph *dense_new(uint32_t n) {
    DenseGraph *g = malloc(sizeof *g);
    g->matrix = calloc((size_t)n * n, sizeof *g->matrix);
    g->n      = n;
    return g;
}

void dense_add_edge(DenseGraph *g, uint32_t from,
                    uint32_t to, uint32_t weight) {
    g->matrix[from * g->n + to] = weight;
}

int dense_has_edge(const DenseGraph *g,
                   uint32_t from, uint32_t to) {
    return g->matrix[from * g->n + to] != 0;
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: BFS, DFS, Dijkstra. Rust leans on std::collections; C does
 * the explicit queue array and visited array, and the O(V^2) scan Dijkstra.
 * ------------------------------------------------------------------------- */
const rustInter = `use std::collections::{VecDeque, BinaryHeap, HashSet, HashMap};
use std::cmp::Reverse;

// BFS: shortest path in unweighted graph.
// Returns the visited order from start node.
fn bfs(graph: &Graph, start: u32) -> Vec<u32> {
    let mut visited = HashSet::new();
    let mut queue   = VecDeque::new();
    let mut order   = Vec::new();

    visited.insert(start);
    queue.push_back(start);

    while let Some(node) = queue.pop_front() {
        order.push(node);
        for &(neighbour, _weight) in graph.neighbours(node) {
            if !visited.contains(&neighbour) {
                visited.insert(neighbour);
                queue.push_back(neighbour);
                // queue: FIFO ensures level-by-level
                // the stacks and queues page built this
            }
        }
    }
    order
}

// DFS: iterative using an explicit stack.
// Recursive DFS uses the call stack instead.
fn dfs(graph: &Graph, start: u32) -> Vec<u32> {
    let mut visited = HashSet::new();
    let mut stack   = Vec::new(); // Vec as stack
    let mut order   = Vec::new();

    stack.push(start);

    while let Some(node) = stack.pop() {
        if visited.contains(&node) { continue; }
        visited.insert(node);
        order.push(node);

        for &(neighbour, _weight) in graph.neighbours(node) {
            if !visited.contains(&neighbour) {
                stack.push(neighbour);
                // stack: LIFO gives depth-first behaviour
            }
        }
    }
    order
}

// Dijkstra: shortest path in weighted graph.
// Returns distance to every reachable node.
fn dijkstra(graph: &Graph, start: u32)
    -> HashMap<u32, u32>
{
    // BinaryHeap: min-heap using Reverse wrapper.
    // Holds (cost, node) pairs; tuples compare by
    // cost first, so the cheapest node pops first.
    let mut heap: BinaryHeap<Reverse<(u32, u32)>> =
        BinaryHeap::new();
    let mut dist: HashMap<u32, u32> = HashMap::new();

    dist.insert(start, 0);
    heap.push(Reverse((0, start)));

    while let Some(Reverse((cost, node))) = heap.pop() {
        // skip if we found a better path already
        if cost > *dist.get(&node).unwrap_or(&u32::MAX) {
            continue;
        }
        for &(neighbour, weight) in graph.neighbours(node) {
            let new_cost = cost + weight;
            let best = dist.entry(neighbour)
                           .or_insert(u32::MAX);
            if new_cost < *best {
                *best = new_cost;
                heap.push(Reverse((new_cost, neighbour)));
                // priority queue picks lowest cost next
                // same BinaryHeap as the mempool priority queue
            }
        }
    }
    dist
}`;

const cInter = `#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define INF UINT32_MAX

/*
 * BFS in C: iterative with a queue array.
 * queue[]: plain array. each node enters at most
 * once, so capacity n is always enough.
 * visited[]: boolean array indexed by node id.
 */
void bfs(const Graph *g, uint32_t start,
         uint32_t *order, uint32_t *order_len) {
    uint8_t  *visited = calloc(g->n, 1);
    uint32_t *queue   = malloc(g->n * sizeof *queue);
    uint32_t  head = 0, tail = 0;
    *order_len = 0;

    visited[start] = 1;
    queue[tail++]  = start;

    while (head < tail) {
        uint32_t node   = queue[head++];
        order[(*order_len)++] = node;
        for (Edge *e = g->heads[node]; e; e = e->next) {
            if (!visited[e->to]) {
                visited[e->to] = 1;
                queue[tail++]  = e->to;
            }
        }
    }
    free(visited);
    free(queue);
}

/*
 * Dijkstra in C: simple O(V^2) version.
 * For sparse graphs use a min-heap.
 * This version scans all nodes for the minimum.
 * Clear. Correct. O(V^2 + E).
 */
void dijkstra(const Graph *g, uint32_t start,
              uint32_t *dist) {
    uint8_t *done = calloc(g->n, 1);

    for (uint32_t i = 0; i < g->n; i++)
        dist[i] = INF;
    dist[start] = 0;

    for (uint32_t iter = 0; iter < g->n; iter++) {
        /* find unvisited node with minimum distance */
        uint32_t u = g->n;
        for (uint32_t i = 0; i < g->n; i++)
            if (!done[i] && (u == g->n || dist[i] < dist[u]))
                u = i;
        if (u == g->n || dist[u] == INF) break;
        done[u] = 1;

        /* relax edges from u */
        for (Edge *e = g->heads[u]; e; e = e->next) {
            if (dist[u] + e->weight < dist[e->to])
                dist[e->to] = dist[u] + e->weight;
        }
    }
    free(done);
    /* dist[i] = shortest path cost from start to i */
    /* INF means unreachable */
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: topological sort. Rust: Kahn's algorithm over HashMap/VecDeque.
 * C: Kahn's algorithm over an adjacency matrix with explicit arrays.
 * ------------------------------------------------------------------------- */
const rustAdv = `use std::collections::{VecDeque, HashMap};

// Topological sort using Kahn's algorithm (BFS-based).
// Works only on DAGs. Returns None if cycle detected.
// Used by cargo to order crate compilation.
fn topological_sort(
    graph: &HashMap<u32, Vec<u32>>,
    nodes: &[u32],
) -> Option<Vec<u32>> {
    // compute in-degrees
    let mut in_degree: HashMap<u32, usize> =
        nodes.iter().map(|&n| (n, 0)).collect();

    for neighbours in graph.values() {
        for &nb in neighbours {
            *in_degree.entry(nb).or_insert(0) += 1;
        }
    }

    // start with nodes that have no dependencies
    let mut queue: VecDeque<u32> = in_degree.iter()
        .filter(|(_, &d)| d == 0)
        .map(|(&n, _)| n)
        .collect();

    let mut result = Vec::new();

    while let Some(node) = queue.pop_front() {
        result.push(node);
        if let Some(neighbours) = graph.get(&node) {
            for &nb in neighbours {
                let deg = in_degree.get_mut(&nb).unwrap();
                *deg -= 1;
                if *deg == 0 { queue.push_back(nb); }
            }
        }
    }

    // if result has all nodes: no cycle (valid DAG)
    // if fewer: cycle detected
    if result.len() == nodes.len() { Some(result) }
    else                           { None }
}`;

const cAdv = `#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/*
 * Topological sort: Kahn's algorithm in C.
 * Works on an adjacency matrix for simplicity.
 * Returns 1 on success (DAG), 0 if cycle detected.
 */
int topo_sort(const uint32_t *matrix, uint32_t n,
              uint32_t *result) {
    int      *in_deg = calloc(n, sizeof *in_deg);
    uint32_t *queue  = malloc(n * sizeof *queue);
    uint32_t  head = 0, tail = 0, count = 0;

    /* compute in-degrees */
    for (uint32_t i = 0; i < n; i++)
        for (uint32_t j = 0; j < n; j++)
            if (matrix[j * n + i]) in_deg[i]++;

    /* seed queue with zero in-degree nodes */
    for (uint32_t i = 0; i < n; i++)
        if (in_deg[i] == 0) queue[tail++] = i;

    while (head < tail) {
        uint32_t node = queue[head++];
        result[count++] = node;
        for (uint32_t nb = 0; nb < n; nb++) {
            if (!matrix[node * n + nb]) continue;
            if (--in_deg[nb] == 0)
                queue[tail++] = nb;
        }
    }

    free(in_deg);
    free(queue);
    return count == n; /* 1 = DAG, 0 = cycle */
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED part two: gossip propagation through the Bitcoin peer graph.
 * The same BFS from level 02, applied to financial infrastructure.
 * ------------------------------------------------------------------------- */
const rustGossip = `use std::collections::{HashMap, HashSet, VecDeque};

type NodeId = u32;

fn gossip_propagate(
    peers: &HashMap<NodeId, Vec<NodeId>>,
    origin: NodeId,
    _tx_hash: [u8; 32],
) -> HashSet<NodeId> {
    // BFS through the peer graph.
    // Exactly the bfs() function from level 02.
    let mut reached = HashSet::new();
    let mut queue   = VecDeque::new();

    reached.insert(origin);
    queue.push_back(origin);

    while let Some(node) = queue.pop_front() {
        // broadcast to all peers of this node
        for &peer in &peers[&node] {
            if !reached.contains(&peer) {
                reached.insert(peer);
                queue.push_back(peer);
                // send_tx(peer, tx_hash);
            }
        }
    }
    reached
    // O(V + E): every node and every connection.
    // this is how your transaction reaches
    // every miner on the network
}`;

const cGossip = `void gossip_propagate(const Graph *peers,
                      uint32_t origin,
                      uint32_t *reached,
                      uint32_t *reached_count) {
    uint8_t  *visited = calloc(peers->n, 1);
    uint32_t *queue   = malloc(peers->n * sizeof *queue);
    uint32_t  head = 0, tail = 0;
    *reached_count = 0;

    visited[origin] = 1;
    queue[tail++]   = origin;

    while (head < tail) {
        uint32_t node = queue[head++];
        reached[(*reached_count)++] = node;
        for (Edge *e = peers->heads[node]; e; e = e->next) {
            if (!visited[e->to]) {
                visited[e->to] = 1;
                queue[tail++]  = e->to;
                /* send_tx(e->to, tx_hash); */
            }
        }
    }
    free(visited);
    free(queue);
    /* BFS through the peer graph */
    /* O(V + E) where V=nodes E=connections */
}`;

export const graphs: PageContent = {
  slug: "graphs",
  hexLabel: "0x1A",
  category: "structure",
  hero: {
    eyebrow: "root.system / 0x1A / graphs",
    title: `Everything is connected.<br><span class="highlight">Not everything is a tree.</span>`,
    lede: `The internet is a graph. The Bitcoin peer network is a graph. Your social network is a graph. Every routing table on every router on every continent is a graph. A tree is a graph with no cycles. This page is what happens when you remove that restriction.`,
    narrativeHtml: `<p>You already know trees.</p>
<p>A tree is a linked list that branches. One root. No cycles. Every node reachable from the top.</p>
<p>But the real world does not follow those rules.</p>
<p>The internet has no single root. Bitcoin nodes connect to multiple peers. Not in a hierarchy. In a mesh. Any node can reach any other node through multiple paths.</p>
<p>If one path fails another exists. If one router dies traffic reroutes. If one Bitcoin node goes offline the network continues.</p>
<p>This resilience comes from one thing.</p>
<p><strong>Cycles.</strong></p>
<p>The moment you allow a cycle a tree becomes a graph.</p>
<p>And graphs are the most powerful data structure in computer science. Not because they are complex. Because everything is one.</p>
<p>The internet is a graph. Your social network is a graph. A GPS finding the fastest route is a graph. The Lightning Network that routes Bitcoin payments is a graph.</p>
<p>Every routing algorithm you have ever benefited from was running on a graph.</p>
<p>You just never saw it.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "What makes a **graph**",
      blocks: [
        {
          kind: "prose",
          html: `<p>A graph has two things. Nodes. And edges. That is it.</p>
<p>Nodes are the things. Edges are the connections between them. Everything else is a property of the edges.</p>`,
        },
        { kind: "diagram", name: "graph-types" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "UNDIRECTED",
              value: "edges have no direction",
              desc: "If A connects to B then B connects to A. Friendship networks, network cables, two-way roads. One edge, both directions.",
            },
            {
              label: "DIRECTED",
              value: "edges have a direction",
              desc: "A can connect to B without B connecting back. Also called a digraph. Twitter follows, web page links, one-way streets, Bitcoin transactions.",
            },
            {
              label: "WEIGHTED",
              value: "edges have a cost",
              desc: "Used when connections are not equal. Road distances, network latency, transaction fees in the Lightning Network. The weight is what shortest-path algorithms minimise.",
            },
            {
              label: "DAG",
              value: "directed, acyclic",
              desc: "Directed edges, no cycles possible. A tree is a DAG with one root. Dependency graphs, git commits, Ethereum transaction ordering.",
            },
          ],
        },
        { kind: "heading", text: "The vocabulary" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "DEGREE",
              value: "edges per node",
              desc: "Undirected: one degree value. Directed: in-degree and out-degree counted separately. A Bitcoin node with 125 peers has degree 125.",
            },
            {
              label: "PATH",
              value: "a sequence of edges",
              desc: "A walk from node to node along edges. A path from A to D might be A, B, C, D. Shortest path algorithms find the minimum cost path.",
            },
            {
              label: "CYCLE",
              value: "a path back to itself",
              desc: "A path that starts and ends at the same node. Trees have none. Graphs can. Cycles are what give networks resilience and redundancy.",
            },
            {
              label: "CONNECTED",
              value: "everything reachable",
              desc: "An undirected graph is connected if every node can reach every other node. The internet must be connected to work. The Bitcoin network must be connected to propagate blocks.",
            },
            {
              label: "SPARSE vs DENSE",
              value: "how many edges",
              desc: "Sparse: few edges relative to nodes. Internet routing graphs are sparse. Dense: close to n squared edges. Celebrity social networks are dense.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>Two ways to represent a graph in code. Both common. Different tradeoffs. The adjacency list is the linked list page applied per node; the adjacency matrix is the arrays page applied in two dimensions.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "graph.rs" },
            c: { language: "c", code: cBeginner, label: "graph.c" },
          },
        },
        { kind: "widget", name: "graph-explorer" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "BFS, DFS, and **finding paths**",
      blocks: [
        { kind: "heading", text: "Breadth-First Search" },
        {
          kind: "prose",
          html: `<p>Start at a node. Visit all its neighbours first. Then their neighbours. Level by level.</p>
<p>BFS uses a queue. You built one on the stacks and queues page; this is what it was for. FIFO order is exactly what makes the traversal expand level by level, and that is why BFS is <strong>guaranteed to find the shortest path in an unweighted graph</strong>. O(V + E) time. O(V) space.</p>
<p>Uses: shortest path in unweighted graphs. Finding all nodes within k hops. Bitcoin gossip, where transactions propagate level by level through the peer network. Degrees of separation in a social network. A web crawler discovering linked pages.</p>`,
        },
        { kind: "heading", text: "Depth-First Search" },
        {
          kind: "prose",
          html: `<p>Start at a node. Go as deep as possible before backtracking.</p>
<p>DFS uses a stack. Or recursion, which is the same call stack from the memory and recursion pages doing the bookkeeping for you. DFS does not guarantee the shortest path. O(V + E) time. O(V) space.</p>
<p>Uses: detecting cycles. Topological sorting of a DAG. Maze solving. Finding connected components. Git dependency resolution.</p>`,
        },
        { kind: "diagram", name: "bfs-vs-dfs" },
        { kind: "heading", text: "Dijkstra" },
        {
          kind: "prose",
          html: `<p>Weighted graphs need a smarter algorithm. BFS treats all edges as equal. Dijkstra uses edge weights.</p>
<p>The key idea: <strong>always expand the lowest-cost unvisited node</strong>. That needs a priority queue, the same BinaryHeap from the stacks and queues page. O((V + E) log V).</p>
<p>This is the reason your GPS finds the fastest route. The reason internet routers run OSPF. The reason packets flow through the lowest-latency path.</p>
<p>Step by step on a small weighted graph. Edges: A to B costs 4, A to C costs 2, C to B costs 1, C to D costs 5, B to D costs 2. Start at A: distance to A is 0, all others infinity.</p>`,
        },
        {
          kind: "table",
          headers: ["Step", "Expand", "Updates"],
          rows: [
            ["1", "A (cost 0)", "B: min(inf, 0+4) = 4. C: min(inf, 0+2) = 2."],
            ["2", "C (cost 2, lowest unvisited)", "D: min(inf, 2+5) = 7. B: min(4, 2+1) = 3. Update!"],
            ["3", "B (cost 3)", "D: min(7, 3+2) = 5. Update!"],
            ["4", "D (cost 5)", "Done."],
          ],
        },
        {
          kind: "prose",
          html: `<p>Shortest path A to D: A → C → B → D, cost 5. The direct-looking route through B alone would have cost 6. Dijkstra found the detour that is actually cheaper, which is exactly what your packets do through routers every second.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "traverse.rs" },
            c: { language: "c", code: cInter, label: "traverse.c" },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// three algorithms, three structures from the previous page",
          body: `BFS runs on a queue. DFS runs on a stack. Dijkstra runs on a priority queue. All three were built on the stacks and queues page, and the hash set keeping track of visited nodes is the hashing page at work. Without O(1) visited lookups, BFS and DFS would degrade from O(V + E) to O(V^2). Graph algorithms are not new machinery. They are the previous five pages composed.`,
        },
      ],
    },
    /* =================================================================
       LEVEL 03 . ADVANCED
       ================================================================= */
    {
      level: "advanced",
      number: "03",
      title: "Real graphs: routing, gossip, and the **Lightning Network**",
      blocks: [
        { kind: "heading", text: "Topological sort" },
        {
          kind: "prose",
          html: `<p>For DAGs: ordering the nodes so every edge points forward in the sequence. Used by build systems like make and cargo build, dependency resolution, task scheduling, and git commit ordering.</p>
<p><strong>Kahn's algorithm</strong> is BFS-based. Start with the nodes that have no incoming edges. Process them. Remove their edges. Repeat. O(V + E).</p>
<p>The DFS-based version: run DFS, push each node to a stack when it finishes, reverse the stack. That finish-time ordering is the postorder from the trees page. Same result. Same complexity.</p>`,
        },
        { kind: "heading", text: "Strongly connected components" },
        {
          kind: "prose",
          html: `<p>In a directed graph: a group of nodes where every node can reach every other. Kosaraju's algorithm finds them in two DFS passes; Tarjan's algorithm does it in one. O(V + E) for both.</p>
<p>Used in compiler optimisation, deadlock detection, web page ranking (PageRank), and social network analysis.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "topo_sort.rs" },
            c: { language: "c", code: cAdv, label: "topo_sort.c" },
          },
        },
        { kind: "heading", text: "Graphs inside Bitcoin and Lightning" },
        {
          kind: "prose",
          html: `<p>Bitcoin uses graphs at three levels. Each one essential. Each one a direct application of what this page described.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "PEER NETWORK",
              value: "an undirected graph",
              desc: "Nodes: Bitcoin nodes worldwide. Edges: TCP connections. Degree: 8 outbound, up to 125 total per node. Transaction broadcast is BFS through this graph.",
            },
            {
              label: "TRANSACTION DAG",
              value: "a directed acyclic graph",
              desc: "Each transaction spends outputs of earlier transactions. Cycles are impossible: you cannot spend money before it exists. Block inclusion order is a topological sort.",
            },
            {
              label: "LIGHTNING NETWORK",
              value: "a weighted graph",
              desc: "Nodes: Lightning nodes. Edges: payment channels. Weights: capacity and fees. Routing a payment is a modified Dijkstra, minimising fees under capacity constraints.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p><strong>The peer network.</strong> Every Bitcoin node connects to 8 outbound and up to 125 total peers. When you broadcast a transaction it propagates by gossip: your node sends it to its neighbours, they send it to theirs. BFS through the peer graph. Within seconds the entire network knows.</p>
<p>The graph is intentionally tuned: dense enough that no single node failure disconnects the network, sparse enough that message overhead stays manageable. This is graph connectivity applied to financial infrastructure.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustGossip, label: "gossip.rs" },
            c: { language: "c", code: cGossip, label: "gossip.c" },
          },
        },
        {
          kind: "prose",
          html: `<p><strong>The transaction DAG.</strong> Transaction B spends an output of transaction A. Transaction C spends outputs of A and B. A is an ancestor of B and C; B is a parent of C. No cycles are possible, because a cycle would mean spending money before it exists.</p>`,
        },
        { kind: "diagram", name: "transaction-dag" },
        {
          kind: "prose",
          html: `<p>This DAG matters for Child-Pays-For-Parent. If transaction A has a fee too low to confirm, you create transaction B that spends A's output with a high fee. Miners want B, but a child cannot enter a block before its parent, so they must include A first. The inclusion order is a topological sort of the transaction DAG. Kahn's algorithm. Running inside Bitcoin Core. Every block.</p>
<p><strong>The Lightning Network.</strong> Payment channels between nodes, each with a balance and a fee. Sending a payment means finding a path through the channel graph: a modified Dijkstra that minimises fees while respecting capacity.</p>`,
        },
        { kind: "diagram", name: "lightning-route" },
        {
          kind: "prose",
          html: `<p>Alice has no direct channel to Dave, but Dijkstra finds Alice → Bob → Carol → Dave, and the payment routes along that path, each hop deducting its fee. The Lightning Network is Dijkstra on a financial graph. Your payment is a shortest path query.</p>
<p>This is why Lightning payments are instant. Not because there is no blockchain. Because graph traversal at O((V + E) log V) is extremely fast.</p>`,
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// 10 minutes vs milliseconds",
          body: `Bitcoin confirms a transaction roughly every 10 minutes, because confirmation requires proof of work over a new block. Lightning routes a payment in milliseconds, because routing requires only a shortest path query over the channel graph. Same money. Same cryptography underneath. The difference between the two speeds is a graph algorithm.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where graphs appear in ScrapyBytes",
    introHtml: `<p>Once you can see the node-and-edge shape, it is everywhere in this curriculum. Here is where this page reaches back.</p>`,
    items: [
      {
        slug: "trees",
        text: `A tree is a graph with no cycles. DFS on a graph generalises DFS on a tree; BFS finds shortest paths the way it finds tree levels. Trees are the special case, graphs the general one.`,
      },
      {
        slug: "stacks-queues",
        text: `BFS runs on a queue, DFS on a stack, Dijkstra on the priority queue. Three traversals, three structures, all built on the stacks and queues page.`,
      },
      {
        slug: "linked-list",
        text: `An adjacency list is linked lists stored in an array: each edge is a list node, prepend is O(1), iteration is O(degree). The linked list page is the implementation.`,
      },
      {
        slug: "arrays",
        text: `An adjacency matrix is a 2D array: matrix[i][j] is the edge weight or 0. O(1) lookup, O(V^2) space. The arrays page named both sides of that tradeoff.`,
      },
      {
        slug: "pointers",
        text: `An adjacency list is an array of pointers, each the head of an edge list. Following edges is following pointers. Graph traversal is pointer chasing at scale.`,
      },
      {
        slug: "memory",
        text: `Every adjacency list lives on the heap, one allocation per edge node. Large graphs consume gigabytes. Graphs stress the heap harder than any other structure in this curriculum.`,
      },
      {
        slug: "recursion",
        text: `DFS is naturally recursive: visit, mark, recurse on neighbours, base case when everything is visited. Every DFS is recursion or an explicit stack simulating it.`,
      },
      {
        slug: "hashing",
        text: `The visited set in BFS and DFS is a hash set: O(1) "have I seen this node". Without it traversal degrades from O(V + E) to O(V^2). Hashing keeps graphs fast.`,
      },
      {
        slug: "binary",
        text: `Every node id and edge weight is binary in memory, and an adjacency matrix is a grid of 0s and 1s. Graphs are binary numbers arranged in a meaningful shape.`,
      },
      {
        slug: "sorting",
        text: `Topological sort orders the nodes of a DAG so all edges point forward, O(V + E). The DFS variant uses the postorder from the trees page. It is the graph generalisation of sorting.`,
      },
      {
        slug: "big-o",
        text: `BFS and DFS: O(V + E). Dijkstra: O((V + E) log V). These costs decide whether a routing algorithm survives internet scale. The Big O page named them; graphs are where they matter most.`,
      },
      {
        slug: "networking",
        text: `The internet is a graph: routers are nodes, cables are edges. OSPF runs Dijkstra, BGP runs path-vector. The networking page showed the packets; this page is the algorithm underneath.`,
      },
      {
        slug: "distributed-systems",
        text: `A distributed system is a graph of machines and connections. A network partition splits the graph; consensus operates over it. Graph theory is the language the CAP theorem is written in.`,
      },
      {
        slug: "blockchain",
        text: `The peer network is a graph, transaction history is a DAG, Lightning is a weighted graph. Gossip is BFS, ordering is topological sort, routing is Dijkstra. Every block, every payment.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1B",
    title: "The mathematics that makes the internet secure: cryptography, keys, and signatures.",
    href: "/cryptography",
    label: "cryptography",
    variant: "magenta",
  },
};
