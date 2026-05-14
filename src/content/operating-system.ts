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

export const operatingSystem: PageContent = {
  slug: "operating-system",
  hexLabel: "0x07",
  category: "system",
  hero: {
    eyebrow: "root.system / 0x07 / system",
    title: `One CPU.<br><span class="highlight">Many programs.</span>`,
    lede: `The CPU page showed a machine that runs <em>one</em> instruction stream. The memory page showed an address space that belongs to <em>one</em> process. Right now your laptop is running hundreds of programs across a handful of cores, and they don't trample each other. The thing in the middle making that work is the <strong>operating system</strong>.`,
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
