export type Topic = {
  href: string;
  /** Display name in nav and on the topic card. */
  label: string;
  /** Two-digit ordinal shown on the home card. */
  num: string;
  /** CSS color value used for the title, level pips, and hover underline. */
  accent: string;
  /** One-line description for the home topic card. */
  desc: string;
  /** Number of depth levels on the page (currently always 3). */
  levels: number;
};

/**
 * Single source of truth for topics.
 * Add a new entry here, create the matching content + page route,
 * and the home page + nav + footer all update automatically.
 */
export const topics: Topic[] = [
  {
    href: "/number-systems",
    label: "Number Systems",
    num: "01",
    accent: "var(--neon-emerald)",
    desc: "Decimal, binary, octal, hex, plus the weirder ones. Why programmers move between bases, and how.",
    levels: 3,
  },
  {
    href: "/binary",
    label: "Binary",
    num: "02",
    accent: "var(--neon-lime)",
    desc: "Two symbols. Infinite meaning. Counting, shifting, two's complement, IEEE 754 floats.",
    levels: 3,
  },
  {
    href: "/ascii",
    label: "ASCII",
    num: "03",
    accent: "var(--neon-cyan)",
    desc: "The agreement that turns bit patterns into language. 7-bit ASCII, control codes, and the leap to UTF-8.",
    levels: 3,
  },
  {
    href: "/logic-gates",
    label: "Logic Gates",
    num: "04",
    accent: "var(--neon-magenta)",
    desc: "The physical switches that are the bits. CMOS transistors, NAND universality, adders.",
    levels: 3,
  },
  {
    href: "/cpu",
    label: "CPU",
    num: "05",
    accent: "var(--neon-violet)",
    desc: "Wire it all together. Fetch-decode-execute, registers and ALUs, pipelines, caches, branch prediction.",
    levels: 3,
  },
  {
    href: "/memory",
    label: "Memory",
    num: "06",
    accent: "var(--neon-amber)",
    desc: "Where state lives. RAM vs ROM, stack vs heap, virtual memory, and how Rust, C and GC'd languages manage it.",
    levels: 3,
  },
  {
    href: "/operating-system",
    label: "Operating System",
    num: "07",
    accent: "var(--neon-azure)",
    desc: "One CPU, hundreds of programs. Kernel vs user mode, syscalls, processes, threads, schedulers, virtual memory.",
    levels: 3,
  },
  {
    href: "/variables",
    label: "Variables",
    num: "08",
    accent: "var(--neon-rose)",
    desc: "What `let x = 42` actually does. Stack vs heap, primitive vs dynamic, alignment, and lifetime, in Rust and C.",
    levels: 3,
  },
  {
    href: "/pointers",
    label: "Pointers",
    num: "09",
    accent: "var(--neon-mint)",
    desc: "A number that means somewhere. Why pointers power every data structure, and the five classic bugs. C raw pointers vs Rust ownership.",
    levels: 3,
  },
  {
    href: "/compile-vs-runtime",
    label: "Compile vs Runtime",
    num: "10",
    accent: "var(--neon-coral)",
    desc: "Two phases of every program. What gets decided when, why pushing work earlier matters, and how the split shows up in every layer above.",
    levels: 3,
  },
  {
    href: "/arrays",
    label: "Arrays",
    num: "11",
    accent: "var(--neon-saffron)",
    desc: "Houses on a numbered street. Contiguous memory, O(1) indexing, cache locality, and the structure underneath every other data structure.",
    levels: 3,
  },
  {
    href: "/linked-list",
    label: "Linked List",
    num: "12",
    accent: "var(--neon-iris)",
    desc: "A chain of nodes, each one pointing at the next. The data structure that trades cache locality for cheap inserts, and the one every other pointer-y structure is built from.",
    levels: 3,
  },
  {
    href: "/hashing",
    label: "Hashing",
    num: "13",
    accent: "var(--neon-flame)",
    desc: "A fingerprint for anything. Hash functions, hash maps, collision handling, cryptographic hashes, Merkle trees, and the chain in blockchain.",
    levels: 3,
  },
  {
    href: "/nodes",
    label: "Nodes",
    num: "14",
    accent: "var(--neon-teal)",
    desc: "One word, three scales. A node in a data structure, a node on a network, a node in a blockchain. The same essential pattern, applied from bytes to billion-dollar systems.",
    levels: 3,
  },
  {
    href: "/networking",
    label: "Networking",
    num: "15",
    accent: "var(--neon-sky)",
    desc: "Where one machine becomes many. IP addresses, packets, TCP/IP, routing, sockets, and why every previous topic shows up the moment two computers talk.",
    levels: 3,
  },
  {
    href: "/distributed-systems",
    label: "Distributed Systems",
    num: "16",
    accent: "var(--neon-indigo)",
    desc: "No single machine knows everything. Many computers, no central authority, eventual agreement. CAP theorem, gossip, Byzantine fault tolerance, and why this is the page right before blockchain.",
    levels: 3,
  },
  {
    href: "/blockchain",
    label: "Blockchain",
    num: "17",
    accent: "var(--neon-bitcoin)",
    desc: "The capstone. From one transistor in 1947 to a financial network nobody owns. How every previous topic stacks into Bitcoin, end to end, with nothing missing.",
    levels: 3,
  },
];

export const topicLinks = topics.map(({ href, label }) => ({ href, label }));
