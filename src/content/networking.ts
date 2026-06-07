import type { PageContent } from "@/types/content";

const rustTcpClient = `// A TCP client in Rust. Connect to a server, send bytes, read a reply.
// std::net::TcpStream is the "socket" the OS hands you; behind it,
// the kernel is doing the handshake, retransmits, reordering, the lot.
use std::io::{Read, Write};
use std::net::TcpStream;

fn main() -> std::io::Result<()> {
    // Open a connection. Under the hood: DNS lookup, three-way handshake,
    // a kernel-side socket file descriptor returned to us.
    let mut sock = TcpStream::connect("example.com:80")?;

    // Write some bytes. To us, .write_all() is a function call.
    // To the OS, it's: copy into the send buffer, segment into packets,
    // attach TCP and IP headers, hand to the NIC.
    sock.write_all(b"GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n")?;

    // Read until the server closes the stream. Each read may return less
    // than asked: TCP is a byte stream, not a message stream.
    let mut response = Vec::new();
    sock.read_to_end(&mut response)?;

    // The bytes that just arrived crossed the planet, were broken into
    // packets, took unknown routes, possibly arrived out of order, and
    // were reassembled into the exact sequence you see in this Vec.
    println!("{}", String::from_utf8_lossy(&response));
    Ok(())
}`;

const cTcpClient = `#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    // 1. Ask the OS for a socket: a kernel data structure representing
    //    one endpoint of a future connection. Returns a small integer
    //    (a file descriptor) you treat like a file from now on.
    int sock = socket(AF_INET, SOCK_STREAM, 0);

    // 2. Where are we connecting to? Build the destination address.
    struct sockaddr_in dest = { 0 };
    dest.sin_family = AF_INET;
    dest.sin_port   = htons(80);                 // port 80, network byte order
    inet_pton(AF_INET, "93.184.216.34", &dest.sin_addr); // example.com

    // 3. connect() triggers the TCP 3-way handshake under the hood.
    //    Blocks until the server agrees (or times out).
    connect(sock, (struct sockaddr*)&dest, sizeof dest);

    // 4. send() and recv(): from here on the socket is just a stream.
    //    The kernel handles packetisation, retransmission, ordering.
    const char *req = "GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n";
    send(sock, req, strlen(req), 0);

    char buf[4096];
    ssize_t n = recv(sock, buf, sizeof buf - 1, 0);
    buf[n] = '\\0';
    printf("%s", buf);

    close(sock);
    return 0;
}`;

const rustTcpServer = `// The matching server. Accept connections in a loop, echo back the bytes.
// Notice: every accepted socket is just another stream you read/write.
use std::io::{Read, Write};
use std::net::TcpListener;

fn main() -> std::io::Result<()> {
    // bind() reserves a port; listen() tells the kernel to queue
    // incoming connections; both happen inside ::bind().
    let listener = TcpListener::bind("0.0.0.0:7878")?;

    for incoming in listener.incoming() {
        let mut sock = incoming?;
        let mut buf = [0u8; 1024];

        // accept() returned a fresh socket for this connection.
        // The kernel completed the handshake before we ever woke up.
        let n = sock.read(&mut buf)?;
        sock.write_all(&buf[..n])?;       // echo the bytes back
        // Dropping sock closes the connection (sends FIN, frees the fd).
    }
    Ok(())
}`;

const cPacketStruct = `#include <stdint.h>

// A simplified view of what's actually on the wire when you send data.
// Every layer adds its own header before the payload of the layer above.
struct IpHeader {
    uint8_t  version_and_ihl;     // IPv4, header length
    uint8_t  type_of_service;
    uint16_t total_length;
    uint16_t identification;
    uint16_t flags_and_fragment;
    uint8_t  ttl;                 // time to live; routers decrement it
    uint8_t  protocol;            // 6 = TCP, 17 = UDP
    uint16_t header_checksum;
    uint32_t source_ip;           // the binary form of 192.168.1.1
    uint32_t dest_ip;
};

struct TcpHeader {
    uint16_t source_port;
    uint16_t dest_port;
    uint32_t sequence_number;     // for ordering and gap detection
    uint32_t ack_number;          // "I've received everything up to here"
    uint16_t data_offset_and_flags;
    uint16_t window_size;
    uint16_t checksum;
    uint16_t urgent_pointer;
};

// On the wire: [ IpHeader ][ TcpHeader ][ payload (your bytes) ]
//
// The OS builds this for you on every write(). The NIC turns it into
// electrical or optical pulses. The other side's NIC turns those pulses
// back into bytes. Its OS strips off the headers and hands your bytes
// up the stack to the receiving application.`;

const rustHttpParse = `// HTTP is just ASCII on top of TCP. Bytes are bytes; the protocol is
// a *convention* about what those bytes mean. Parse a request line:
fn parse_request_line(bytes: &[u8]) -> Option<(&str, &str)> {
    // Bytes -> str. Validates UTF-8 (HTTP request lines are ASCII, but
    // headers may contain UTF-8 in modern HTTP).
    let line = std::str::from_utf8(bytes.split(|&b| b == b'\\r').next()?).ok()?;

    // "GET /index.html HTTP/1.1" -> ("GET", "/index.html")
    let mut parts = line.split(' ');
    let method = parts.next()?;
    let path   = parts.next()?;
    Some((method, path))
}

// HTTPS is the same thing, but TLS wraps the byte stream first.
// TLS does three jobs: identity (certificate, verified by cryptographic
// hash), confidentiality (symmetric encryption), and integrity (MAC).
// All three are built out of the hashing primitives from the hashing page.`;

export const networking: PageContent = {
  slug: "networking",
  hexLabel: "0x0F",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x0F / system",
    title: `One machine becomes <span class="highlight">many.</span>`,
    lede: `Every previous topic lived inside one machine. Binary, gates, CPU, memory, pointers, arrays, linked lists, hashing, the operating system. One isolated computer. The moment two computers connect, computer science changes completely. Networking is the discipline of making messages survive the trip across copper and fiber, across continents, across machines that do not trust each other. Every previous topic shows up here, in some new disguise.`,
    narrativeHtml: `<p>Stop reading for one second and notice something.</p>
<p>Your computer is talking to strangers right now.</p>
<p>Not one. Thousands. Machines in Tokyo. Servers in warehouses youll never see. Packets crossing fiber optic cable that runs along the floor of the Pacific Ocean, in the dark, under miles of cold water.</p>
<p>All of it happening while you sit perfectly still.</p>
<p>Until this page, every topic lived inside one machine. Bits. Gates. The CPU loop. Memory. Pointers. Arrays. One isolated box, thinking to itself.</p>
<p>A machine alone can only work with what it already holds.</p>
<p>The moment two machines connect, that changes completely. Now your bits have to leave the building. They cross hardware you dont own, routed by people youll never meet, through cables anyone with a boat could cut.</p>
<p>And every one of those conversations is still just binary. The same zeros and ones from page two. Sliced into packets. Wrapped in addresses. Thrown into the dark with no promise they arrive.</p>
<p>Most of them make it. Some dont. The machine has to survive both.</p>
<p>Page fourteen gave each computer an identity, a node with an address of its own. This page is about what those nodes actually say to each other, and how a message lives long enough to be heard.</p>
<p>Tokyo is sixty milliseconds away.</p>
<p>Lets send something there.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "Two machines, **one conversation**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Imagine two computers. One in Tokyo. One in London. The Tokyo machine wants to send the bytes <code>"hello"</code> to the London one. Simple, right? It is not. The instant the message leaves the first machine, the universe becomes chaos:</p>
<ul>
  <li>How does the sender even find the receiver, across billions of other machines?</li>
  <li>How does the receiver know the message is for it?</li>
  <li>What if the message is corrupted in flight by a noisy cable or a faulty switch?</li>
  <li>What if only half of it arrives?</li>
  <li>What if the chunks arrive out of order?</li>
  <li>What if someone intercepts it on the way?</li>
  <li>What if one of the machines lies about who it is?</li>
</ul>
<p>Networking is the body of agreements, code, and hardware that answers these questions, end to end. The wonderful thing is that almost every answer is built from concepts you have already seen.</p>`,
        },
        { kind: "heading", text: "Step one: every machine gets a number" },
        {
          kind: "prose",
          html: `<p>The first job networking does is to give every connected machine an <strong>address</strong>. An <strong>IP address</strong>. Like <code>192.168.1.1</code>. That looks like four small numbers separated by dots, but it is just one number, written in a friendly way. The same address in binary is:</p>
<p><code>11000000.10101000.00000001.00000001</code></p>
<p>Thirty-two bits. Four bytes. One machine on a network. The dots are for humans; the wire only sees the bits. The binary page already covered numbers; an IP address is one of those numbers, used to identify a place rather than a quantity.</p>
<p>There are now billions of these addresses in use, on phones, laptops, servers, routers, satellites, IoT toasters, Bitcoin nodes. IPv4 (32 bits, ~4 billion addresses) ran out of headroom; IPv6 (128 bits, more addresses than there are atoms in everything you can see) is taking over.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the binary page",
          body: `An IP address is the binary page's "numbers are just numbers" point, applied to identity instead of arithmetic. <code>192.168.1.1</code> and <code>11000000.10101000.00000001.00000001</code> and <code>0xC0A80101</code> are the same 32-bit integer written three ways. The dotted form is friendly notation, nothing more.`,
        },
        { kind: "heading", text: "Step two: messages are split into packets" },
        {
          kind: "prose",
          html: `<p>Long messages do not travel whole. The operating system on the sending side splits the data into small chunks called <strong>packets</strong>. Each packet carries a header full of metadata (where it came from, where it is going, which packet it is in the sequence) and a small chunk of the original payload.</p>`,
        },
        { kind: "diagram", name: "packet-structure" },
        {
          kind: "prose",
          html: `<p>The browser does not send web pages. It sends packets. Your messaging app does not send messages, it sends packets. Netflix is packets. Spotify is packets. A Bitcoin transaction is packets. Every byte of every protocol you have ever used was, on the wire, a stream of these tiny binary chunks.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the arrays page",
          body: `A packet's payload is a fixed-size byte array, exactly the structure from the arrays page. The header is a struct of integers (IP addresses, port numbers, sequence numbers), laid out contiguously the way the variables page described. From the wire's point of view, everything is just bytes; the meaning is the protocol's job.`,
        },
        { kind: "heading", text: "Step three: build a connection in code" },
        {
          kind: "prose",
          html: `<p>The two snippets below open a TCP connection to a web server, send an HTTP request, read the response, and close. Notice how little you have to know about packets, addresses, or routing to do this. The OS does all of it for you.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTcpClient },
            c: { language: "c", code: cTcpClient },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the pointers page",
          body: `That <code>sock</code> is, in C, just a small integer (a file descriptor). The kernel hands you a number that indexes into one of its own internal tables, and you use the number to read and write to a network connection the same way you would read and write to a file. From your program's view, it's a handle. From the kernel's view, the handle points at a data structure full of buffers, sequence numbers, retransmit timers, and routing state. The pointers page would call it an opaque reference; the OS would call it the public face of a socket.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "**TCP/IP**: how machines agree to talk",
      blocks: [
        {
          kind: "prose",
          html: `<p>The internet is not one network. It is a <em>network of networks</em>, glued together by an agreement that everyone follows: <strong>TCP/IP</strong>. The ASCII page covered another agreement (the one that says <code>A = 65</code>); TCP/IP is the same kind of thing, several orders of magnitude bigger. It is the set of rules for how machines find each other, address messages, split them apart, reassemble them, and recover when something fails.</p>`,
        },
        { kind: "heading", text: "A network of networks" },
        { kind: "diagram", name: "network-of-networks" },
        {
          kind: "prose",
          html: `<p>Between your laptop in Tokyo and a server in London sits a long chain of <strong>routers</strong>, each one a small specialised computer whose entire job is to look at incoming packets and decide where to forward them next. The decision is local: "is this packet's destination one of my directly connected networks? No? Then which of my neighbours is most likely to get it closer to where it is going?"</p>
<p>The remarkable thing is that no single router knows the whole map. They cooperate by sharing routing tables with their neighbours, and the global behaviour emerges. The internet is not a cloud or a magic substrate. It is millions of these little forwarding decisions, billions of times per second, all the way down.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the CPU and logic-gates pages",
          body: `Every router is a computer, with its own CPU (often a specialised network-processing unit), its own RAM, its own packet-forwarding engine built from logic gates. Some of them are commodity Linux boxes; some are custom silicon that forwards 10 terabits per second per chip. Either way, the same fetch-decode-execute story from the CPU page is running on each one, just decoding "forward packet" instead of "add two numbers".`,
        },
        { kind: "heading", text: "Reliable byte streams on top of unreliable packets" },
        {
          kind: "prose",
          html: `<p><strong>IP</strong> (the bottom half of TCP/IP) delivers individual packets. It makes no promises. Packets can be dropped, duplicated, reordered, corrupted. The internet is, fundamentally, a best-effort packet delivery service. That is the whole guarantee.</p>
<p><strong>TCP</strong> (the top half) is what turns that mess into a reliable, ordered byte stream. It adds three things on top of IP:</p>
<ul>
  <li><strong>Sequence numbers</strong> on every packet, so the receiver can put them back in order.</li>
  <li><strong>Acknowledgements</strong>, so the sender knows what arrived and what didn't.</li>
  <li><strong>Retransmission</strong>, so anything that gets lost is sent again, automatically, without your application ever knowing.</li>
</ul>`,
        },
        { kind: "diagram", name: "packet-reassembly" },
        {
          kind: "prose",
          html: `<p>If packet 3 in the diagram above never arrives, the receiver notices the gap (it has packets 1, 2, 4 but no 3) and asks the sender to send packet 3 again. The application reading the socket sees one continuous stream of bytes. It does not see the retries, the reordering, the duplicates, or the gaps. That's the whole magic of TCP: it hands your program an illusion of a perfect pipe, on top of an actual network that is messy and lossy.</p>`,
        },
        { kind: "heading", text: "Before any of that: the handshake" },
        { kind: "diagram", name: "tcp-handshake" },
        {
          kind: "prose",
          html: `<p>A TCP connection is opened with the famous <strong>three-way handshake</strong>: <code>SYN</code> from the client, <code>SYN-ACK</code> back from the server, <code>ACK</code> from the client. The point of these three messages is to agree on starting sequence numbers in both directions and to confirm that both ends can actually hear each other. After that, the byte stream is open and either side can write.</p>
<p>Closing is the same shape in reverse, with <code>FIN</code> and <code>ACK</code>. None of this is your application's problem. <code>TcpStream::connect</code> and <code>connect()</code> are wrappers that run the handshake before they return.</p>`,
        },
        { kind: "widget", name: "tcp-handshake-sim" },
        { kind: "heading", text: "Look at what's actually on the wire" },
        {
          kind: "prose",
          html: `<p>The C struct below is a simplified view of the IP and TCP headers that get prepended to every payload you send. Every <code>write()</code> on a socket walks through code like this inside the kernel.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustTcpServer },
            c: { language: "c", code: cPacketStruct },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// connect back to the memory page",
          body: `Where do packets live while they're waiting to be sent or processed? In RAM. The OS allocates kernel-side <strong>packet buffers</strong> (often called <code>sk_buff</code>s on Linux), each one a small heap block holding the bytes plus a doubly linked list pointer so it can be queued and dequeued in O(1). When you write to a socket, your bytes are copied into the send buffer; when bytes arrive from the wire, they wait in the receive buffer until your program reads them. Too many packets arriving too fast? They queue. A traffic jam made of memory pages.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Every previous topic, showing up at **every layer**",
      blocks: [
        { kind: "heading", text: "The whole stack, with everything labelled" },
        {
          kind: "prose",
          html: `<p>The point of this page, more than any of the others, is that nothing here is new. Networking is the moment where every previous topic on the site lights up at once. Walk down a single packet from your laptop to a remote server, and you are walking through every page you have already read:</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "binary",
              value: "Pulses on a wire",
              desc: "Every packet is binary. Voltages on copper, photons on glass, modulated radio on wifi. The binary page covered how numbers are encoded in bits; networking is that encoding moving through physical media at near the speed of light.",
            },
            {
              label: "ASCII / agreements",
              value: "HTTP, DNS, JSON",
              desc: "Most application-level protocols are ASCII (or UTF-8) on top of TCP. <code>GET /index.html HTTP/1.1</code> is human-readable text, agreed on by everyone, turned into bytes, sent across the world. ASCII said <code>A = 65</code>; HTTP says the line ending is <code>\\\\r\\\\n</code>.",
            },
            {
              label: "logic gates",
              value: "Routers in silicon",
              desc: "Every router and switch is a computer, every computer is logic gates, every gate is a transistor. The fastest core-network switches forward packets in single-digit nanoseconds because their forwarding tables are baked into ASICs.",
            },
            {
              label: "CPU",
              value: "Two CPUs, in parallel",
              desc: "Your network card has its own processor (a NIC) doing checksum offload, segmentation, sometimes encryption. While your main CPU runs your application, the NIC is handling packets in parallel, freeing the cores for application work.",
            },
            {
              label: "memory",
              value: "Packet buffers",
              desc: "Send buffers, receive buffers, socket queues, retransmit queues. All in kernel RAM. When the network is slow and your app keeps writing, the send buffer fills up; eventually the OS makes <code>write()</code> block until the buffer drains. Backpressure made of memory pressure.",
            },
            {
              label: "arrays",
              value: "Payloads are bytes",
              desc: "Every packet payload is a fixed-size byte array, the structure from the arrays page. Receive buffers are ring buffers, also arrays. The whole network stack moves arrays of bytes from one place to another.",
            },
            {
              label: "linked lists",
              value: "Packet queues",
              desc: "Inside the kernel, packets typically sit in doubly linked lists: one for the receive queue, one for the send queue, one for the retransmit queue, one for each socket's pending data. The linked-list page covered why: O(1) enqueue and dequeue, no copying, no shifting.",
            },
            {
              label: "pointers",
              value: "Sockets and FDs",
              desc: "A socket is, from your program's side, a number; from the kernel's side, a pointer at a struct. The pointers page's <em>a number that means somewhere else</em> is exactly the relationship between a file descriptor and the buffers, sequence numbers, and connection state it stands for.",
            },
            {
              label: "hashing",
              value: "HTTPS, signatures, tokens",
              desc: "Every <code>https://</code> URL relies on the hashing page. TLS uses cryptographic hashes for certificate verification, for the integrity check on every record, for the key derivation. JWTs, API signatures, session cookies, all hashes underneath. Without hashing, the open internet is unauthenticated and unsafe.",
            },
            {
              label: "operating system",
              value: "Owns the network stack",
              desc: "The OS page covered syscalls and the kernel boundary. Sockets, ports, packet buffers, retries, timeouts, routing tables, ARP caches: all kernel state. Your application barely sees any of it. <code>send()</code> and <code>recv()</code> are syscalls, and on the other side of that syscall is the entire stack.",
            },
          ],
        },
        { kind: "heading", text: "HTTP, and why it's still mostly text" },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustHttpParse },
            c: { language: "rust", code: rustHttpParse },
          },
        },
        {
          kind: "prose",
          html: `<p>HTTP is a deliberately simple convention on top of TCP. A request line, some headers, a blank line, a body. Plain bytes. You can talk HTTP by hand with <code>telnet</code> or <code>nc</code>. The reason the web took off in the 1990s is that this protocol is straightforward enough for a human to read on a terminal, simple enough for a beginner to implement in an afternoon, and rich enough to carry anything you want on top.</p>
<p>HTTPS is the same thing, with TLS wrapping the byte stream first. TLS does three jobs: identity (the server proves who it is, using a certificate verified by cryptographic hash), confidentiality (the bytes are symmetrically encrypted in flight), and integrity (a MAC catches any tampering). All three jobs are built out of the hashing primitives from the hashing page.</p>`,
        },
        { kind: "heading", text: "The convergence: blockchain as a networking story" },
        {
          kind: "prose",
          html: `<p>This is where the whole site comes together. Bitcoin is not, fundamentally, a currency. It is a <strong>networking system</strong>: thousands of mutually distrusting machines, scattered across the planet, somehow agreeing on the same history of transactions.</p>
<p>Every Bitcoin node is a computer on the open internet. They find each other by IP, talk over TCP, and exchange messages using a documented protocol on top. When you broadcast a transaction, your node sends a packet to every peer it knows about. Each of those peers verifies it (signatures, hashes, balances) and forwards it to <em>their</em> peers. The transaction spreads across the network the same way a rumour spreads through a crowded room. This is called <strong>gossip</strong>.</p>`,
        },
        { kind: "diagram", name: "bitcoin-gossip" },
        {
          kind: "prose",
          html: `<p>Within a few seconds, every node in the network has the new transaction in its pending pool (its "mempool"). No central server. No coordinator. No trust between nodes. The protocol just says: forward what you see, after you verify it.</p>
<p>Then comes the agreement step. Miners assemble valid transactions into a candidate block. They race to find a <em>nonce</em> that makes the block's hash come out with enough leading zeros (the hashing page's proof-of-work). The first one to succeed broadcasts the block via the same gossip protocol. Every other node receives it, verifies the hash, verifies that every transaction in it is valid, verifies that the block's <code>prev_hash</code> matches the tip of the chain they already have, and if it all checks out, adds the block to their own copy of the chain.</p>
<p>Notice that nobody trusts anybody, and yet, within minutes, every node in the world agrees on the same chain. That is networking, hashing, and proof-of-work doing their jobs together. The agreement is not social; it is mathematical.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the whole site, in one paragraph",
          body: `Transistors switch on and off. Logic gates compose them into adders and registers. Adders and registers compose into a CPU. The CPU runs the operating system. The operating system manages memory and sockets. Sockets carry packets across networks. Networks span the planet. Hashing secures the packets. And on top of all of it, blockchains turn the network itself into a machine for agreement, where mutually distrusting computers converge on the same truth not because they chose to, but because the mathematics gave them no other choice. That is the full ladder, top to bottom, no gaps.`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>Networking has decades of depth. If any of this lit you up:</p>
<ul>
  <li><strong>BGP</strong>. The routing protocol that holds the public internet together. ASes, peering, route leaks, the entire political economy of who can reach whom.</li>
  <li><strong>QUIC and HTTP/3</strong>. The newer generation of transport, running over UDP, multiplexing streams, cutting handshake latency. Built into every modern browser.</li>
  <li><strong>TLS 1.3 in detail</strong>. Modern cryptography, modern key exchange, modern forward secrecy. Read the RFC; it is unusually readable.</li>
  <li><strong>libp2p</strong>. The networking stack used by IPFS and Ethereum, generalising the lessons of BitTorrent and Bitcoin into a reusable peer-to-peer toolkit.</li>
  <li><strong>DPDK and io_uring</strong>. How modern servers move packets at line rate by bypassing the traditional kernel network stack.</li>
  <li><strong>Tigerbeetle, ScyllaDB, and friends</strong>. Databases built around the realities of modern networking: zero-copy I/O, NUMA awareness, lock-free queues. The systems where the whole stack from this site is in play simultaneously.</li>
</ul>`,
        },
      ],
    },
  ],
  connections: {
    items: [
      {
        slug: "operating-system",
        text: `A socket is an OS file descriptor, and every packet leaves through a syscall into the kernel. The networking page rides entirely on the OS page's plumbing.`,
      },
      {
        slug: "binary",
        text: `A packet is binary on a wire: headers, addresses, and payload all bits. The binary page is what is actually moving between machines.`,
      },
      {
        slug: "ascii",
        text: `HTTP is plain ASCII wrapped in TCP. <code>GET / HTTP/1.1</code> is the ASCII page sent across the world. The protocol is human-readable on purpose.`,
      },
      {
        slug: "number-systems",
        text: `An IPv4 address is four base-ten numbers, IPv6 is base sixteen, a MAC address is hex. Addresses on this page are the number systems page on the wire.`,
      },
      {
        slug: "nodes",
        text: `Every machine on a network is a node with an address. The nodes page is the same word at data-structure scale; here the nodes are whole computers.`,
      },
      {
        slug: "distributed-systems",
        text: `The moment two computers talk you have a distributed system and all its problems: partitions, latency, disagreement. The distributed-systems page is where this page gets hard.`,
      },
      {
        slug: "hashing",
        text: `TLS verifies every HTTPS connection with SHA-256, and each packet's integrity is checked with a hash. The hashing page is what makes the traffic on this page trustworthy.`,
      },
      {
        slug: "cpu",
        text: `Sending data means interrupts, DMA, and the CPU handing buffers to the network card. The CPU page is the machine doing the work behind every packet.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x10",
    title: "No single machine knows everything. Many machines, no boss, eventual agreement.",
    href: "/distributed-systems",
    label: "distributed systems",
    variant: "magenta",
  },
};
