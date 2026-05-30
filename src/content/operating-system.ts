import type { PageContent } from "@/types/content";

const rustSyscall = `// printf?  read?  open?  In the end, every one of those goes
// through the OS via a *system call*. Here's the same write
// done two ways: the high-level library, and the raw syscall.

use std::io::Write;

fn main() {
    // High-level: Rust's std::io. Cross-platform; calls into libc,
    // which eventually issues the OS syscall.
    let _ = std::io::stdout().write_all(b"hello via std\\n");

    // Low-level (Linux/macOS): write(fd=1, buf, len) is syscall #1
    // on x86_64 Linux. Going through libc keeps it portable.
    extern "C" {
        fn write(fd: i32, buf: *const u8, count: usize) -> isize;
    }
    let msg = b"hello via syscall\\n";
    unsafe { write(1, msg.as_ptr(), msg.len()); }
}`;

const cSyscall = `// On Linux, write() is a libc wrapper around the kernel's
// sys_write, syscall number 1 on x86_64. We can call it
// directly via syscall(2), bypassing the libc wrapper.
#include <stdio.h>
#include <unistd.h>
#include <sys/syscall.h>

int main(void) {
    // High-level: libc, ultimately a syscall.
    printf("hello via printf\\n");

    // One layer down: the libc wrapper that names the syscall.
    write(1, "hello via write()\\n", 18);

    // Raw: name the syscall by its number.
    syscall(SYS_write, 1, "hello via SYS_write\\n", 20);
    return 0;
}`;

const rustFork = `// fork() asks the kernel to clone the current process.
// Both processes return from fork(): the child sees 0,
// the parent sees the child's PID. Then the OS schedules them
// independently on whatever cores are free.

use std::process;

fn main() {
    extern "C" {
        fn fork() -> i32;
        fn getpid() -> i32;
        fn wait(status: *mut i32) -> i32;
    }

    println!("[parent] starting, pid={}", process::id());

    let pid = unsafe { fork() };
    match pid {
        -1 => panic!("fork failed"),
        0  => {
            // Child branch.
            let cpid = unsafe { getpid() };
            println!("[child]  hello, pid={cpid}");
        }
        n  => {
            // Parent branch: wait for the child.
            let mut status = 0;
            unsafe { wait(&mut status); }
            println!("[parent] child {n} exited");
        }
    }
}`;

const cFork = `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    printf("[parent] starting, pid=%d\\n", getpid());

    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        // Child branch.
        printf("[child]  hello, pid=%d\\n", getpid());
    } else {
        // Parent branch.
        int status;
        wait(&status);
        printf("[parent] child %d exited\\n", pid);
    }
    return 0;
}`;

const rustMmap = `// Read a file by *mapping* it into memory: the kernel pages in
// each block on demand, on first touch, instead of \`read()\`-ing
// it byte by byte. Same syscall every database, log indexer, and
// language runtime uses for fast file access.

use std::fs::File;
use std::os::fd::AsRawFd;

fn main() -> std::io::Result<()> {
    extern "C" {
        fn mmap(addr: *mut u8, len: usize, prot: i32,
                flags: i32, fd: i32, off: i64) -> *mut u8;
        fn munmap(addr: *mut u8, len: usize) -> i32;
    }
    const PROT_READ:    i32 = 1;
    const MAP_PRIVATE:  i32 = 2;

    let f = File::open("Cargo.toml")?;
    let len = f.metadata()?.len() as usize;
    let ptr = unsafe {
        mmap(std::ptr::null_mut(), len,
             PROT_READ, MAP_PRIVATE, f.as_raw_fd(), 0)
    };

    // The file is now bytes in our address space, but no actual
    // RAM has been allocated yet. The kernel pages each 4 KB
    // chunk in only when we touch it.
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let s = std::str::from_utf8(&bytes[..bytes.len().min(80)]).unwrap();
    println!("first chars: {s}");

    unsafe { munmap(ptr, len); }
    Ok(())
}`;

const cMmap = `#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/stat.h>

int main(void) {
    int fd = open("Makefile", O_RDONLY);
    if (fd < 0) { perror("open"); return 1; }

    struct stat st;
    fstat(fd, &st);

    // Ask the kernel for a virtual address window backed by the file.
    // No data is read yet; the page table just gets new entries
    // marked "this region maps to that file."
    char *p = mmap(NULL, st.st_size,
                   PROT_READ, MAP_PRIVATE, fd, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    // Touching p[0] triggers a page fault, which the kernel
    // services by reading the first 4 KB of the file into RAM
    // and patching the page table. From then on, access is
    // a normal load, no syscall on the fast path.
    fwrite(p, 1, st.st_size < 80 ? st.st_size : 80, stdout);
    putchar('\\n');

    munmap(p, st.st_size);
    close(fd);
    return 0;
}`;

const cppBitcoin = `#include <thread>
#include <mutex>

std::mutex mempool_mutex;

class BitcoinNode {
    std::thread net_thread;
    std::thread validation_thread;
    std::thread rpc_thread;
    bool running = true;

    void net_main() {
        /* OS schedules this thread */
        /* manages TCP connections  */
        /* each connection: one socket fd */
        /* multiplexed with epoll/kqueue */
        while (running) {
            poll_peers();      /* non-blocking I/O */
            gossip_txns();     /* write() syscall  */
        }
    }

    void validation_main() {
        while (running) {
            std::lock_guard<std::mutex> lock(mempool_mutex);
            /* only one thread validates at a time */
            validate_next_block();
        }       /* mutex released here (RAII) */
    }
};
/* C++ trusts you to use mutexes correctly.
 * Forget the lock: silent data race at runtime. */`;

const rustBitcoin = `use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

struct Mempool { /* pending transactions */ }
impl Mempool { fn validate_pending(&mut self) {} }

struct BitcoinNode {
    mempool: Arc<Mutex<Mempool>>,
    running: Arc<AtomicBool>,
}

impl BitcoinNode {
    fn start(&self) {
        let mempool = Arc::clone(&self.mempool);
        let running = Arc::clone(&self.running);

        /* OS creates and schedules this thread */
        thread::spawn(move || {
            while running.load(Ordering::Relaxed) {
                /* Rust enforces: only one writer at a time.
                 * Forget the lock: compile error, not a race. */
                let mut pool = mempool.lock().unwrap();
                pool.validate_pending();
                /* MutexGuard drops here - lock released */
            }
        });
    }
}
/* Same OS primitives. Different safety guarantees.
 * Bitcoin Core (C++) prevents races at code review.
 * Rust prevents them at compile time. */`;

export const operatingSystem: PageContent = {
  slug: "operating-system",
  hexLabel: "0x07",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x07 / system",
    title: `One CPU.<br><span class="highlight">Many programs.</span>`,
    lede: `The CPU page showed a machine that runs <em>one</em> instruction stream. The memory page showed an address space that belongs to <em>one</em> process. Right now your laptop is running hundreds of programs across a handful of cores, and they don't trample each other. The thing in the middle making that work is the <strong>operating system</strong>.`,
    narrativeHtml: `<p>Your code has never spoken to your CPU.</p>
<p>Not once.</p>
<p>Every instruction you have ever written.<br>Every function you have ever called.<br>Every file you have ever opened.</p>
<p>None of it reaches the hardware directly.</p>
<p>It all goes through a middleman.</p>
<p>The operating system.</p>
<p>Your program lives in a box the OS drew.<br>It can only see the memory the OS gave it.<br>It can only use the CPU time the OS allows.<br>It can only touch the hardware by asking the OS for permission.</p>
<p>This is not a limitation.<br>It is what makes computing reliable.</p>
<p>Without the OS your program and every other program running on the same machine would share one address space. One set of registers. One CPU.</p>
<p>And the first bug in any one of them would corrupt everything else.</p>
<p>The OS is the thing that decided that could not be allowed.</p>
<p>And built the walls to enforce it.</p>`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What an **operating system** is for",
      blocks: [
        {
          kind: "prose",
          html: `<p>An operating system is, at its heart, just <em>another program</em>. The trick is that it runs in a <strong>privileged mode</strong> the CPU itself enforces, and every other program runs inside the box the OS draws around it. The OS owns the hardware. Your program asks for things; the OS decides whether and how to give them to you.</p>
<p>Three jobs make up almost everything an OS does:</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "job 01",
              value: "Multiplex",
              desc: "Share one CPU between hundreds of programs. Share one disk, one network card, one screen. Make each program think it owns the machine.",
            },
            {
              label: "job 02",
              value: "Isolate",
              desc: "Stop programs from reading each other's memory, corrupting each other's files, or crashing the whole machine when one of them dies.",
            },
            {
              label: "job 03",
              value: "Abstract",
              desc: "Hide the differences between disks, between network cards, between keyboards. Expose one uniform interface (files, sockets, processes) that programs can target.",
            },
          ],
        },
        { kind: "heading", text: "User mode and kernel mode" },
        {
          kind: "prose",
          html: `<p>The CPU has, baked into the silicon, two modes: <strong>kernel mode</strong> (full access to every instruction, every memory address, every device) and <strong>user mode</strong> (restricted: most instructions allowed, but anything that touches hardware traps). The OS kernel runs in kernel mode. Your program runs in user mode. There is no in-between.</p>
<p>So how does your program ever <em>do</em> anything: open a file, send a packet, allocate memory? It asks the kernel. That request is called a <strong>system call</strong>.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The CPU's two modes are enforced in silicon. Kernel mode and user mode are bits in a CPU control register. The same CPU you learned about on page 5. The same fetch-decode-execute loop. The privilege level is just another bit pattern the CPU checks before executing certain instructions. <a href="/cpu">← see: CPU</a></p>`,
        },
        { kind: "heading", text: "Every program is, ultimately, a sequence of syscalls" },
        {
          kind: "prose",
          html: `<p>Underneath <code>println!</code>, <code>printf</code>, <code>fopen</code>, <code>malloc</code>, <code>fetch()</code> (under <em>everything</em>) is a syscall. The standard library is mostly a polite, portable wrapper around them.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustSyscall },
            c: { language: "c", code: cSyscall },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the syscall instruction",
          body: `On x86_64, the actual mechanism is a single instruction: <code>syscall</code>. The user program puts the syscall number in <code>rax</code>, args in registers, and executes <code>syscall</code>. The CPU traps, switches to kernel mode, and jumps to a fixed handler the OS installed at boot. When the kernel returns, the CPU drops back to user mode at the next instruction. Every "open a file", "send a packet", "fork a process" is exactly one of these traps.`,
        },
        { kind: "heading", text: "How the OS itself starts running" },
        {
          kind: "prose",
          html: `<p>Power on. The CPU jumps to a hardcoded address in firmware (<strong>BIOS</strong> on old PCs, <strong>UEFI</strong> on modern ones). Firmware finds a <strong>bootloader</strong> on disk and runs it. The bootloader loads the OS <strong>kernel</strong> into memory, then jumps to it. The kernel sets up page tables, starts the scheduler, mounts file systems, and finally launches the first user-mode process: <strong>init</strong> on Unix, <strong>System</strong> on Windows. From there, init starts every other process you'll ever run.</p>
<p>That entire chain is just CPUs jumping to addresses. There's no magic. Every step is a continuation of the fetch-decode-execute loop you already know.</p>`,
        },
        { kind: "widget", name: "process-scheduler" },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "Processes, threads &amp; **scheduling**",
      blocks: [
        { kind: "heading", text: "What a process actually is" },
        {
          kind: "prose",
          html: `<p>A <strong>process</strong> is the OS's bookkeeping for one running program. It's a struct in the kernel containing, roughly:</p>
<ul>
  <li>A <strong>page table</strong>: its private virtual address space (see the memory page).</li>
  <li>The current <strong>register state</strong>: instruction pointer, stack pointer, and the rest of the CPU's registers, frozen for when this process isn't running.</li>
  <li>A table of <strong>open file descriptors</strong>: small integers that index into kernel-side objects (open files, sockets, pipes).</li>
  <li>A <strong>process ID</strong>, a parent process ID, credentials, signal handlers, working directory.</li>
</ul>
<p>That's the entire identity of a "running program". On Linux you can read it: <code>cat /proc/&lt;pid&gt;/status</code>. The whole struct, formatted for humans.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">A process struct in the kernel is just a data structure in memory. The page table pointer, register state, file descriptor table - all of it binary data at a memory address. The OS manages processes the same way your programs manage linked lists and arrays. With pointers. With structs. With the same memory operations you learned on pages 6 and 9. <a href="/memory">← see: Memory</a> · <a href="/pointers">← see: Pointers</a></p>`,
        },
        { kind: "heading", text: "Creating processes: fork &amp; exec" },
        {
          kind: "prose",
          html: `<p>Unix has an unusual but elegant model for starting a new program. Two syscalls do it:</p>
<ul>
  <li><code>fork()</code> clones the calling process. After fork, there are <em>two</em> processes with identical memory, identical file descriptors, identical everything except their PID and fork's return value.</li>
  <li><code>exec()</code> replaces the current process's program with a different binary. Same PID, same file descriptors, brand new code and data.</li>
</ul>
<p>To run <code>ls</code> from a shell: <code>fork()</code> a copy of the shell, then in the child, <code>exec("ls")</code>. The shell stays alive (it's the parent), and the child becomes <code>ls</code>. Two syscalls, every command in your terminal.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustFork },
            c: { language: "c", code: cFork },
          },
        },
        { kind: "heading", text: "Threads: lightweight processes" },
        {
          kind: "prose",
          html: `<p>A <strong>thread</strong> is an independent stream of execution that <em>shares</em> its process's address space and file descriptors with other threads. Cheaper to create than a process, faster to switch between, and able to communicate just by reading the same memory.</p>
<p>That last property is also threads' biggest pitfall. If two threads write to the same variable without coordination, you get a <strong>data race</strong>: undefined behaviour in C, a compile error in safe Rust. The languages diverge here. C trusts you to use mutexes correctly; Rust's type system tracks which references can cross thread boundaries and refuses to compile the unsafe combinations.</p>`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">Rust prevents data races at compile time. A data race is two threads writing to the same memory without coordination. The ownership system tracks which references can cross thread boundaries. If two threads could write the same value the code does not compile. C trusts you with mutexes. Rust enforces the contract. <a href="/compile-vs-runtime">← see: Compile vs Runtime</a></p>`,
        },
        { kind: "heading", text: "Scheduling: how the OS shares one CPU" },
        {
          kind: "prose",
          html: `<p>You have 8 cores. You have 600 processes. They don't all fit. Every few milliseconds the OS performs a <strong>context switch</strong>: it saves the current process's registers into its kernel struct, picks another runnable process, restores <em>its</em> registers, and resumes. Done fast enough, every process feels like it's running constantly.</p>
<p>Picking <em>which</em> process runs next is the <strong>scheduler</strong>'s job. Some classic strategies:</p>`,
        },
        {
          kind: "table",
          headers: ["scheduler", "rule", "fairness", "where used"],
          rows: [
            [
              "<strong>Round-robin</strong>",
              "Each runnable process gets a fixed time slice in turn",
              "Equal share",
              "Teaching examples; some real-time systems",
            ],
            [
              "<strong>Priority</strong>",
              "Higher-priority always runs first; ties broken by round-robin",
              "Higher pri starves lower",
              "Real-time systems, embedded",
            ],
            [
              "<strong>CFS</strong> (Completely Fair Scheduler)",
              "Track each task's share of CPU time; run the one furthest behind",
              "Proportional to weight",
              "Linux 2.6.23+ (the desktop / server default)",
            ],
            [
              "<strong>MLFQ</strong>",
              "Multiple priority queues; tasks demote on long runs, promote when interactive",
              "Adaptive",
              "macOS, Windows (variants)",
            ],
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// what \"100% CPU\" actually means",
          body: `<code>top</code> shows your program at 100% CPU. That doesn't mean it's running 100% of the time. It means the scheduler is giving it 100% of one core's <em>available</em> time. The kernel itself, interrupt handlers, and other processes still preempt it. There's no such thing as "all of the CPU forever" on a real OS.`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Virtual memory, **I/O** &amp; the kernel boundary",
      blocks: [
        { kind: "heading", text: "Virtual memory, revisited" },
        {
          kind: "prose",
          html: `<p>The memory page covered the <em>idea</em>: every process gets its own virtual address space, the MMU translates virtual to physical at every load and store. The OS is what fills in the table. On every <code>mmap</code>, every <code>fork</code>, every page fault, the kernel adjusts page-table entries and reloads the MMU.</p>
<p>Page faults are the magic. When you touch a virtual address that has no physical page yet, the CPU traps into the kernel. The kernel decides what should be there (a fresh zeroed page, a page from disk, a page being shared with another process), allocates physical RAM, updates the page table, and resumes your program. The instruction that caused the fault re-runs and now succeeds. Your program never knew.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// what \"swap\" actually does",
          body: `Swap is the same mechanism, in reverse. Under memory pressure the kernel writes a rarely-touched page to disk and marks its page-table entry "not present". Next time anyone reads that address, page fault → kernel reads the page back from disk → updates the table → resumes. Slow (millions of cycles) but invisible.`,
        },
        { kind: "heading", text: "Memory-mapped I/O: files as memory" },
        {
          kind: "prose",
          html: `<p>The same machinery makes one of Unix's most beloved tricks work. Instead of <code>read()</code>-ing a file in chunks, <code>mmap</code> asks the kernel to <em>map</em> the file into your address space. The page table now says "addresses X through Y of this process correspond to bytes 0 through N of that file." No data has been copied yet, but as you walk the bytes, page faults pull each 4 KB chunk in on demand.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustMmap },
            c: { language: "c", code: cMmap },
          },
        },
        {
          kind: "prose",
          html: `<p>Databases, log indexers, language runtimes (the JVM, the V8 heap), and dynamic linkers all use <code>mmap</code> heavily. It's how a 100 GB log file becomes a normal pointer you can scan.</p>`,
        },
        { kind: "heading", text: "I/O models: blocking, non-blocking, async" },
        {
          kind: "prose",
          html: `<p>A <code>read()</code> on a network socket can take milliseconds. What does the OS do with your thread while it waits?</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "blocking",
              value: "Sleep the thread",
              desc: "Default. Thread is parked on a kernel wait queue; scheduler picks something else. When data arrives, your thread is woken. Simple to write, expensive at scale (1 thread per connection).",
            },
            {
              label: "non-blocking",
              value: "Return EAGAIN",
              desc: "Set the fd non-blocking; reads return immediately, with an error if nothing's ready. Your thread polls (wastefully, unless paired with the next idea).",
            },
            {
              label: "readiness multiplex",
              value: "epoll / kqueue / IOCP",
              desc: "One syscall, hand it many fds, block until any is ready. One thread serves thousands of connections. The architecture every modern server runs on.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>Async runtimes (Tokio in Rust, libuv under Node, Go's runtime) are built on top of the third option. The runtime keeps an epoll/kqueue loop, schedules user tasks (futures, goroutines, callbacks) onto a small pool of OS threads, and parks them on I/O instead of blocking the thread. The OS provides the readiness primitive; the language runtime provides the ergonomics.</p>`,
        },
        { kind: "heading", text: "The kernel boundary, in one diagram" },
        {
          kind: "diagram",
          name: "kernel-boundary",
        },
        {
          kind: "prose",
          html: `<p>One line, the syscall, is the only way through. Everything in user space funnels through it; the kernel is the only thing that talks to hardware. Lock that boundary down and you get isolation, security, and a stable interface that <em>any</em> user program can target without knowing what hardware it's running on.</p>`,
        },

        /* ── Bitcoin Core section ── */
        { kind: "heading", text: "Bitcoin Core as an operating system client" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin full node on Earth is a program running inside an OS.</p>
<p>Not a special program. Not a privileged program. A regular user-space process.</p>
<p>Bitcoin Core - the reference implementation written in C++ - uses every OS primitive this page has described.</p>`,
        },
        { kind: "heading", text: "Processes and threads" },
        {
          kind: "prose",
          html: `<p>Bitcoin Core spawns multiple threads on startup:</p>
<ul>
  <li>The <strong>main thread</strong>: handles the event loop.</li>
  <li>The <strong>net thread</strong>: manages peer connections.</li>
  <li>The <strong>mempool thread</strong>: validates transactions.</li>
  <li>The <strong>validation thread</strong>: validates new blocks.</li>
  <li>The <strong>RPC thread</strong>: handles API requests.</li>
</ul>
<p>Each thread is scheduled by the OS. Each shares the same process address space. Each must coordinate using mutexes to avoid data races.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitcoin },
            c: { language: "c", code: cppBitcoin, label: "C++" },
          },
        },
        { kind: "heading", text: "Syscalls" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin Core operation is built on syscalls:</p>
<ul>
  <li><code>socket()</code> - create a network socket</li>
  <li><code>connect()</code> - connect to a peer</li>
  <li><code>send()</code> - broadcast a transaction</li>
  <li><code>recv()</code> - receive a new block</li>
  <li><code>open()</code> - open the block database</li>
  <li><code>mmap()</code> - map the UTXO set into memory</li>
  <li><code>epoll()</code> - wait for any peer to send data</li>
  <li><code>futex()</code> - fast mutex for thread coordination</li>
</ul>
<p>The entire peer-to-peer Bitcoin network is <code>socket()</code> + <code>send()</code> + <code>recv()</code>. That is it. The OS provides the sockets. Bitcoin Core provides the protocol. TCP/IP carries the binary packets. The blockchain page showed the full picture. This page shows the OS layer it runs on top of.</p>`,
        },
        { kind: "heading", text: "Memory mapping the UTXO set" },
        {
          kind: "prose",
          html: `<p>The UTXO set (~85 million entries, ~8 GB) is memory-mapped using <code>mmap()</code>.</p>
<p>The OS does not load all 8 GB into RAM at once. It maps the file into the address space. As Bitcoin Core accesses UTXO entries the OS pages them in on demand. Hot UTXOs (recently used) stay in RAM. Cold UTXOs (rarely accessed) get swapped. The OS manages this automatically. Bitcoin Core just follows pointers.</p>
<p>This is the same <code>mmap()</code> from the advanced section above. Used on the largest financial dataset in the history of Bitcoin.</p>`,
        },
        { kind: "heading", text: "epoll and the peer network" },
        {
          kind: "prose",
          html: `<p>Bitcoin Core connects to ~125 peers by default. 125 TCP connections. 125 sockets.</p>
<p>Reading from 125 sockets with 125 threads would use 125 MB of stack memory just for idle threads. Instead Bitcoin Core uses <code>epoll()</code> on Linux or <code>kqueue()</code> on macOS/BSD: one syscall that blocks until any of the 125 sockets has data. One thread. 125 connections. Zero wasted memory.</p>
<p>This is the "readiness multiplex" I/O model from the section above. In production. On the Bitcoin network.</p>
<p>The OS is not just below Bitcoin. It is what Bitcoin runs <em>inside</em>. Every transaction. Every block. Every peer connection. Mediated by the kernel. One syscall at a time.</p>`,
        },
        /* ── end Bitcoin Core section ── */

        { kind: "heading", text: "What different OSes actually share" },
        {
          kind: "prose",
          html: `<p>Linux, macOS, Windows, FreeBSD, the BSDs, illumos: they look different on the surface, but the architecture is the same. Privileged kernel, unprivileged user space, syscalls as the only bridge, virtual memory, processes, schedulers, file abstractions. The interfaces differ (POSIX vs Win32 vs Mach), but the <em>shape</em> doesn't. Once you understand one, you can read the others.</p>`,
        },
        { kind: "heading", text: "The full stack, with the OS in place" },
        {
          kind: "callout",
          variant: "info",
          title: "// from electrons to your terminal prompt",
          body: `<ol style="margin: 0.6rem 0 0 1.4rem;">
  <li>Electrons gated by transistors form <strong>logic gates</strong>.</li>
  <li>Gates compose into <strong>CPUs</strong> and <strong>memory chips</strong>.</li>
  <li>The CPU runs fetch-decode-execute over bits in memory.</li>
  <li>Bits in memory encode numbers, characters, and instructions.</li>
  <li>The <strong>kernel</strong> is one program, granted privileged access by the CPU's mode bits.</li>
  <li>Every other program is run by the kernel, in its own virtual address space, scheduled onto cores, mediated by syscalls.</li>
  <li>Your shell typed at a prompt is one of those user-space programs: exec'd by init, scheduled by the kernel, drawing characters by writing to a file descriptor that ends up in a TTY driver.</li>
  <li>And under <em>that</em> driver, eventually, more electrons gating more transistors.</li>
</ol>`,
        },
        { kind: "heading", text: "Where to dig in next" },
        {
          kind: "prose",
          html: `<p>The OS is one of the largest topics in computing; this page is the one-screen tour. Natural deep-dives:</p>
<ul>
  <li><strong>Operating Systems: Three Easy Pieces</strong> (Arpaci-Dusseau): free online, the kindest modern OS textbook in print.</li>
  <li><strong>The Linux Programming Interface</strong> (Kerrisk): the canonical reference for what every syscall does.</li>
  <li><strong>xv6</strong>, MIT's teaching OS: ~10k lines of C. Read it cover to cover in a week.</li>
  <li><strong>Writing an OS in Rust</strong> (Philipp Oppermann): build a small kernel from scratch on bare metal.</li>
</ul>`,
        },

        /* ── Connections grid ── */
        { kind: "heading", text: "Where the OS appears in ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>The operating system is not an isolated topic. It sits on top of everything below it and beneath everything above it.</p>`,
        },
        {
          kind: "grid",
          columns: 4,
          cards: [
            {
              label: "01 / binary",
              value: "The kernel is binary",
              desc: "The OS kernel is binary machine code. The kernel mode bit is a binary flag in a CPU control register. Every syscall is a binary trap instruction.",
              href: "/binary",
            },
            {
              label: "04 / logic gates",
              value: "Privilege in silicon",
              desc: "The CPU's privilege levels are implemented in logic gates. Gates check the mode bit before executing privileged instructions. The protection is hardware-enforced.",
              href: "/logic-gates",
            },
            {
              label: "05 / cpu",
              value: "The OS owns the CPU",
              desc: "The scheduler controls which process runs on which core. Context switches save and restore the entire CPU register state. The fetch-decode-execute loop serves the OS's will.",
              href: "/cpu",
            },
            {
              label: "06 / memory",
              value: "Every page table",
              desc: "The OS manages every page table, every virtual address space, every allocation. The stack and heap exist because the OS created them. Virtual memory is an OS abstraction over physical RAM.",
              href: "/memory",
            },
            {
              label: "09 / pointers",
              value: "File descriptors",
              desc: "File descriptors are OS-level pointers to kernel objects. Socket fd 5 points to a TCP connection. File fd 3 points to an open file. The kernel is a linked list of these objects internally.",
              href: "/pointers",
            },
            {
              label: "0A / compile vs runtime",
              value: "The runtime boundary",
              desc: "Syscalls are the runtime boundary. Your compiled binary contains the syscall instruction statically. The OS decides at runtime whether to grant the request.",
              href: "/compile-vs-runtime",
            },
            {
              label: "0F / networking",
              value: "The OS owns TCP",
              desc: "TCP/IP is implemented in the kernel. Your program calls send() and recv(). The kernel does packet assembly, routing, and checksums. Every network packet travels through the kernel.",
              href: "/networking",
            },
            {
              label: "0D / hashing",
              value: "Hash tables inside",
              desc: "The OS uses hashing internally. The page table is a hash map of virtual to physical addresses. File system inodes are found via hash. The OS is one of the largest users of hashing.",
              href: "/hashing",
            },
            {
              label: "14 / recursion",
              value: "Stack overflow = SIGSEGV",
              desc: "A stack overflow is a page fault at the stack guard page. The OS detects it and sends SIGSEGV. The kernel enforces the boundary in the page table.",
              href: "/recursion",
            },
            {
              label: "10 / distributed systems",
              value: "Processes on a network",
              desc: "Every node in a distributed system is a process managed by an OS. The OS provides the sockets. The scheduler determines when each node's logic runs.",
              href: "/distributed-systems",
            },
            {
              label: "13 / blockchain",
              value: "Bitcoin runs inside the OS",
              desc: "Bitcoin Core is a user-space process. Its 125 peer connections are sockets managed by the kernel. The UTXO set is memory-mapped via mmap(). The mempool is protected by OS mutexes.",
              href: "/blockchain",
            },
            {
              label: "15 / big o",
              value: "Context switch is O(1)",
              desc: "Saving and restoring registers is a fixed number of operations - O(1). But the real cost is cache invalidation and TLB flushes. Big O explains the algorithm. Cache explains the reality.",
              href: "/big-o",
            },
          ],
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x08",
    title: "Trace one variable end-to-end: where `let x = 42` actually goes",
    href: "/variables",
    label: "variables",
    variant: "magenta",
  },
};
