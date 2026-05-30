import type { PageContent } from "@/types/content";

const rustHi = `fn main() {
    let msg = "Hi";
    for b in msg.bytes() {
        println!("'{}' = {} = 0x{:02X} = {:08b}",
                 b as char, b, b, b);
    }
    // 'H' = 72 = 0x48 = 01001000
    // 'i' = 105 = 0x69 = 01101001
}`;

const cHi = `#include <stdio.h>

int main(void) {
    const char *msg = "Hi";
    for (int i = 0; msg[i] != '\\0'; i++) {
        unsigned char b = msg[i];
        printf("'%c' = %d = 0x%02X = ", b, b, b);
        for (int j = 7; j >= 0; j--)
            putchar((b >> j) & 1 ? '1' : '0');
        putchar('\\n');
    }
    return 0;
}`;

const rustAscii = `fn main() {
    let ch: char = '7';
    let digit = ch as u8 - b'0';
    println!("{} → {}", ch, digit); // 7 → 7

    // uppercase ↔ lowercase via the bit-5 trick
    let upper = b'a' ^ 0x20;             // 'A'
    let lower = b'A' | 0x20;             // 'a'
    println!("{} {}", upper as char, lower as char);

    // ANSI escape: red text in the terminal
    println!("\\x1b[31mERROR\\x1b[0m");
}`;

const cAscii = `#include <stdio.h>

int main(void) {
    char ch = '7';
    int digit = ch - '0';
    printf("%c → %d\\n", ch, digit); // 7 → 7

    // uppercase ↔ lowercase via the bit-5 trick
    char upper = 'a' ^ 0x20;          // 'A'
    char lower = 'A' | 0x20;          // 'a'
    printf("%c %c\\n", upper, lower);

    // ANSI escape: red text in the terminal
    printf("\\x1b[31mERROR\\x1b[0m\\n");
    return 0;
}`;

const rustUtf8 = `fn main() {
    let s = "नमस्ते";

    println!("chars: {}", s.chars().count()); // 6 (with combining)
    println!("bytes: {}", s.len());            // 18

    for b in s.bytes() {
        print!("{:02X} ", b);
    }
    // E0 A4 A8 E0 A4 AE E0 A4 B8 ...
    // each devanagari char = 3 bytes
}`;

const cUtf8 = `#include <stdio.h>
#include <string.h>

int main(void) {
    // C strings are just byte arrays;
    // the compiler stores UTF-8 verbatim.
    const char *s = "नमस्ते";

    printf("bytes: %zu\\n", strlen(s));    // 18
    for (size_t i = 0; s[i]; i++)
        printf("%02X ", (unsigned char)s[i]);
    putchar('\\n');
    // strlen counts BYTES, not characters!
    return 0;
}`;

const cBitcoinHeader = `#include <stdint.h>

// The Bitcoin P2P network message header,
// from Bitcoin Core's primary header file.
struct MessageHeader {
    uint32_t magic;        // 0xD9B4BEF9 for mainnet
    char     command[12];  // ASCII, NUL-padded
    uint32_t length;       // payload size
    uint32_t checksum;     // first 4 bytes of SHA256d
};

// "version" command name as 12 ASCII bytes:
//   76 65 72 73 69 6F 6E 00 00 00 00 00
//   v  e  r  s  i  o  n  \\0 \\0 \\0 \\0 \\0
//
// NUL (0x00, the first control code in ASCII)
// pads the command name to fill the field.`;

const rustBitcoinHeader = `// Same header, in Rust.
#[repr(C)]
struct MessageHeader {
    magic:    u32,        // 0xD9B4BEF9 for mainnet
    command:  [u8; 12],   // ASCII, NUL-padded
    length:   u32,        // payload size
    checksum: [u8; 4],    // first 4 bytes of SHA256d
}

// "version" command name as a 12-byte ASCII literal.
const VERSION_COMMAND: [u8; 12] = *b"version\\0\\0\\0\\0\\0";
// b"..."  creates a byte array;
// each character is its ASCII value;
// \\0 is the NUL control code as a padding byte.

// 76 65 72 73 69 6F 6E 00 00 00 00 00 = the bytes on the wire.`;

export const ascii: PageContent = {
  slug: "ascii",
  hexLabel: "0x03",
  category: "encoding",
  hero: {
    eyebrow: "root.system / 0x03 / encoding",
    title: `Numbers become<br><span class="highlight">language.</span>`,
    lede: `You learned that everything is bits. But how does <code>01000001</code> become the letter <code>A</code>? Through a <strong>convention</strong>: a shared agreement that says "this number means that letter." That agreement is called an <em>encoding</em>, and the most famous one is <strong>ASCII</strong>.`,
  },
  levels: [
    {
      level: "beginner",
      number: "01",
      title: "What is **ASCII**?",
      blocks: [
        {
          kind: "prose",
          html: `<p>In 1963 engineers had a problem. IBM's computers used one code for the letter <code>A</code>. Honeywell used a different one. They literally could not talk to each other.</p>
<p>So a committee sat down and built a universal dictionary. 128 characters. One number each. Agreed on by everyone. Forever.</p>
<p>They called it the <strong>American Standard Code for Information Interchange</strong>. <strong>ASCII</strong>.</p>
<p>Your computer has never read a single letter in its entire life. It only ever reads numbers. ASCII is how numbers pretend to be language.</p>`,
        },
        {
          kind: "prose",
          html: `<p><strong>ASCII</strong> stands for <em>American Standard Code for Information Interchange</em>. It's a lookup table from 1963 that maps numbers <code>0</code> to <code>127</code> to characters: letters, digits, punctuation, and a handful of control codes for old teletype machines.</p>
<p>Why 0 to 127? Because that's exactly what fits in <strong>7 bits</strong> (2⁷ = 128). The 8th bit was originally used for parity error-checking. Today most computers use the full 8-bit byte, with the upper half left for <em>extensions</em>. That's where the modern world's encodings (UTF-8 included) take over.</p>`,
        },
        { kind: "heading", text: "The famous letters" },
        {
          kind: "table",
          headers: ["character", "decimal", "binary", "hex"],
          rows: [
            ["<code>A</code>", "65", "<code>01000001</code>", "<code>0x41</code>"],
            ["<code>B</code>", "66", "<code>01000010</code>", "<code>0x42</code>"],
            ["<code>a</code>", "97", "<code>01100001</code>", "<code>0x61</code>"],
            ["<code>0</code>", "48", "<code>00110000</code>", "<code>0x30</code>"],
            ["<code>(space)</code>", "32", "<code>00100000</code>", "<code>0x20</code>"],
            ["<code>\\n</code> (newline)", "10", "<code>00001010</code>", "<code>0x0A</code>"],
          ],
        },
        {
          kind: "prose",
          html: `<p>Notice <code>A</code> = 65 and <code>a</code> = 97. Exactly 32 apart. Their binary forms differ by one bit (bit 5). That's why uppercase ↔ lowercase conversion is a single XOR operation: <code>'A' ^ 0x20 == 'a'</code>. Cleverness baked right into the table.</p>`,
        },
        { kind: "heading", text: "Try it: one character, one byte" },
        { kind: "widget", name: "char-explorer" },
        { kind: "widget", name: "text-encoder" },
        {
          kind: "raw",
          html: `<p class="connection-line">Each of those bytes lives at a specific memory address in RAM. The OS allocated that space when your program started. <a href="/memory">← see: memory</a></p>`,
        },
        { kind: "heading", text: 'Print "Hi" character by character' },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustHi },
            c: { language: "c", code: cHi },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// the leap",
          body: `A string is just a sequence of bytes. The screen draws letters because someone, somewhere, agreed that byte <code>0x48</code> would mean "H". No magic. Just convention.`,
        },
      ],
    },
    {
      level: "intermediate",
      number: "02",
      title: "The full table &amp; **control codes**",
      blocks: [
        {
          kind: "prose",
          html: `<p>ASCII is split into <strong>printable</strong> characters (32 to 126) and <strong>control codes</strong> (0 to 31, plus 127). Control codes don't draw glyphs. They were instructions for printers and teletypes: ring a bell, move the carriage, start a new line. Many are obsolete. Some are still everywhere.</p>`,
        },
        { kind: "heading", text: "Control codes you still see today" },
        {
          kind: "table",
          headers: ["dec", "name", "escape", "still used?"],
          rows: [
            ["0", "NUL", "<code>\\0</code>", "String terminator in C"],
            ["7", "BEL", "<code>\\a</code>", "Terminal beep"],
            ["8", "BS", "<code>\\b</code>", "Backspace"],
            ["9", "HT", "<code>\\t</code>", "Tab"],
            ["10", "LF", "<code>\\n</code>", "Unix newline"],
            ["13", "CR", "<code>\\r</code>", "Windows uses CRLF (<code>\\r\\n</code>)"],
            ["27", "ESC", "<code>\\e</code>", "Start of ANSI escape sequences (terminal colors!)"],
            ["127", "DEL", "(none)", "Delete"],
          ],
        },
        {
          kind: "raw",
          html: `<p class="connection-line">The ESC character (27) powers every terminal color you have ever seen. <code>\\x1b[31m</code> turns text red. <code>\\x1b[0m</code> resets it. Your terminal is just a stream of ASCII bytes with ESC sequences as the control channel. <a href="/operating-system">← see: operating system</a></p>`,
        },
        { kind: "heading", text: "The printable ASCII table (32 to 126)" },
        {
          kind: "raw",
          html: `<p class="dim mono" style="font-size:0.85rem">hover or tap any cell. each shows the character and its decimal value.</p>`,
        },
        { kind: "asciiGrid" },
        { kind: "heading", text: "Working with ASCII in code" },
        {
          kind: "prose",
          html: `<p>Because characters <em>are</em> numbers, you can do arithmetic on them. The classic example: converting a digit character (<code>'0'</code> to <code>'9'</code>) to its integer value.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAscii },
            c: { language: "c", code: cAscii },
          },
        },
        {
          kind: "callout",
          variant: "info",
          title: "// trivia worth keeping",
          body: `The <code>ESC</code> control code (27) is the gateway to <strong>ANSI escape sequences</strong>. That's how every CLI tool, from <code>git</code> to <code>htop</code>, draws colors and moves the cursor. They're literally just bytes: <code>ESC [ 31 m</code> = "switch to red".`,
        },
        {
          kind: "raw",
          html: `<p class="connection-line">HTTP, the protocol your browser uses, sends its headers as plain ASCII text. <code>GET /index.html HTTP/1.1</code> and <code>Host: scrapybytes.vercel.app</code> are ASCII bytes wrapped in a TCP packet and sent as binary across the internet. <a href="/networking">← see: networking</a></p>`,
        },
      ],
    },
    {
      level: "advanced",
      number: "03",
      title: "Beyond ASCII: **UTF-8** &amp; the world's text",
      blocks: [
        {
          kind: "prose",
          html: `<p>ASCII has 128 slots. The world has more than 100,000 characters in active use: Devanagari, Mandarin, Arabic, emoji, math symbols, ancient scripts. <strong>Unicode</strong> is the modern standard that gives every character a unique number called a <em>code point</em> (e.g. <code>U+0905</code> for अ). <strong>UTF-8</strong> is one way to <em>encode</em> those code points as bytes.</p>`,
        },
        { kind: "heading", text: "The brilliance of UTF-8" },
        {
          kind: "prose",
          html: `<p>UTF-8 was designed by Ken Thompson and Rob Pike on a placemat in a New Jersey diner in 1992. It's a <strong>variable-length</strong> encoding: 1 to 4 bytes per code point, with two crucial properties:</p>
<ol>
  <li><strong>ASCII compatibility.</strong> Any valid ASCII file is also a valid UTF-8 file. The first 128 code points encode as a single byte, identical to ASCII.</li>
  <li><strong>Self-synchronizing.</strong> You can drop into any byte stream and immediately tell whether you're at the start of a character or in the middle of one, just by looking at the high bits.</li>
</ol>`,
        },
        {
          kind: "table",
          headers: ["code point range", "bytes", "byte pattern"],
          rows: [
            ["U+0000 to U+007F", "1", "<code>0xxxxxxx</code>"],
            ["U+0080 to U+07FF", "2", "<code>110xxxxx 10xxxxxx</code>"],
            ["U+0800 to U+FFFF", "3", "<code>1110xxxx 10xxxxxx 10xxxxxx</code>"],
            ["U+10000 to U+10FFFF", "4", "<code>11110xxx 10xxxxxx 10xxxxxx 10xxxxxx</code>"],
          ],
        },
        {
          kind: "prose",
          html: `<p>The leading bits act as a length tag. Continuation bytes always start with <code>10</code>. That's the self-synchronization: if you see a byte starting with <code>10</code>, you know you're mid-character; back up until you find a byte that doesn't.</p>`,
        },
        { kind: "heading", text: '"नमस्ते" in bytes' },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustUtf8 },
            c: { language: "c", code: cUtf8 },
          },
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the trap",
          body: `In C, <code>strlen("नमस्ते")</code> returns <strong>18</strong>, not 6. <code>str[0]</code> gives you a single byte, which is half a character. Slicing UTF-8 strings naively will corrupt them. Rust's <code>&amp;str</code> guarantees valid UTF-8 at the type level; that's one of the language's quiet superpowers.`,
        },
        { kind: "heading", text: "ASCII in blockchain and networking" },
        {
          kind: "prose",
          html: `<p>ASCII shows up everywhere in the infrastructure that runs Bitcoin. When your Bitcoin node connects to another node it sends a handshake message. That message header is ASCII text.</p>
<p>Bitcoin Core uses ASCII command names in its network protocol: <code>version</code>, <code>verack</code>, <code>inv</code>, <code>tx</code>, <code>block</code>. Each command is a 12-byte ASCII string padded with null bytes (<code>0x00</code>) to fill the field. <strong>NUL</strong>, the very first control code in ASCII, is still doing its job inside the Bitcoin network protocol sixty years after ASCII was invented.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBitcoinHeader },
            c: { language: "c", code: cBitcoinHeader },
          },
        },
        {
          kind: "prose",
          html: `<p>And the checksum in that header? SHA-256, applied twice. The same hash function built from AND gates and XOR gates that you will see on the hashing page.</p>
<p>ASCII named the commands. Binary carries the bytes. SHA-256 verifies the integrity. TCP/IP delivers the packet. All four concepts. One message header.</p>`,
        },
        { kind: "heading", text: "Where ASCII appears in ScrapyBytes" },
        {
          kind: "prose",
          html: `<p>ASCII is the most quoted page on the site. Every later topic uses it for something.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "0x02 / binary",
              value: "Letters as bit patterns",
              desc: "ASCII codes are binary numbers. 'A' = 65 = 01000001. Seven bits that carry the weight of an entire alphabet.",
              href: "/binary",
            },
            {
              label: "0x01 / number systems",
              value: "Three masks, one number",
              desc: "ASCII codes are decimal (65), hex (0x41), and binary (01000001). The same number in three masks.",
              href: "/number-systems",
            },
            {
              label: "0x04 / logic gates",
              value: "Case toggle is one XOR",
              desc: "Uppercase to lowercase is one XOR operation. 'A' ^ 0x20 = 'a'. XOR is a logic gate. A logic gate is transistors. The alphabet runs on silicon.",
              href: "/logic-gates",
            },
            {
              label: "0x06 / memory",
              value: "Strings live in RAM",
              desc: "A string is a sequence of bytes at consecutive memory addresses. 'Hello' is five bytes starting at one address, ending five addresses later.",
              href: "/memory",
            },
            {
              label: "0x09 / pointers",
              value: "char* is just an address",
              desc: "In C a string is a pointer. char* str = \"Hello\" makes str the address of the H. The string only exists because the pointer knows where it starts.",
              href: "/pointers",
            },
            {
              label: "0x0B / arrays",
              value: "char arrays + NUL",
              desc: "A string is a char array. Each element one ASCII byte. C strings end with NUL (0x00), the first control code, still working after sixty years.",
              href: "/arrays",
            },
            {
              label: "0x0D / hashing",
              value: "Bytes in, hash out",
              desc: "SHA-256 hashes strings as bytes. 'Hello' becomes its ASCII bytes (72 101 108 108 111) then gets hashed to 256 bits. The input is always ASCII or UTF-8 bytes.",
              href: "/hashing",
            },
            {
              label: "0x0F / networking",
              value: "HTTP is ASCII text",
              desc: "HTTP headers are ASCII text. 'GET / HTTP/1.1' is ASCII. Every web request you have ever made started as ASCII characters converted to binary wrapped in a TCP packet.",
              href: "/networking",
            },
            {
              label: "0x11 / blockchain",
              value: "12-byte ASCII commands",
              desc: "Bitcoin network commands are 12-byte ASCII strings. 'version', 'tx', 'block', NUL-padded to fill the field. ASCII is inside the protocol that moves every Bitcoin transaction.",
              href: "/blockchain",
            },
          ],
        },
        { kind: "heading", text: "Connecting back to bits" },
        {
          kind: "prose",
          html: `<p>Step back and notice the layering. A character (अ) is a Unicode code point (U+0905). That code point gets encoded as bytes (<code>E0 A4 85</code>) by UTF-8. Each byte is 8 bits. Each bit is a voltage (high or low) sitting on a wire connected to a transistor. The next page is where we finally get to that wire.</p>`,
        },
      ],
    },
  ],
  nextUp: {
    eyebrow: "next up / 0x04",
    title: "Bits become physical: transistors & logic gates",
    href: "/logic-gates",
    label: "logic gates",
    variant: "magenta",
  },
};
