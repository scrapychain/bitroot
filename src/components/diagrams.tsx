import type { DiagramName } from "@/types/content";

type Tone = "cyan" | "magenta" | "lime" | "amber" | "violet" | "azure" | "rose" | "mute";

const cell = "diagram-cell";
const cellLabel = "diagram-cell-label";
const cellValue = "diagram-cell-value";
const note = "diagram-note";
const caption = "diagram-caption";
const arrow = "diagram-arrow";
const groupTitle = "diagram-group-title";

interface FrameProps {
  viewBox: string;
  children: React.ReactNode;
  caption?: string;
  ariaLabel: string;
}

function DiagramFrame({ viewBox, children, caption: cap, ariaLabel }: FrameProps) {
  return (
    <figure className="diagram">
      <svg
        className="diagram-svg"
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="diag-arrow-cyan"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--neon-cyan)" />
          </marker>
          <marker
            id="diag-arrow-magenta"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--neon-magenta)" />
          </marker>
          <marker
            id="diag-arrow-amber"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--neon-amber)" />
          </marker>
          <marker
            id="diag-arrow-mute"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg-mute)" />
          </marker>
        </defs>
        {children}
      </svg>
      {cap && <figcaption className={caption}>{cap}</figcaption>}
    </figure>
  );
}

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: Tone;
  label?: string;
  value?: string;
  sublabel?: string;
}

function Box({ x, y, w, h, tone = "cyan", label, value, sublabel }: BoxProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className={`${cell} tone-${tone}`}
        rx="3"
      />
      {label && (
        <text
          x={x + 8}
          y={y + 14}
          className={cellLabel}
        >
          {label}
        </text>
      )}
      {value && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          textAnchor="middle"
          className={`${cellValue} tone-${tone}`}
        >
          {value}
        </text>
      )}
      {sublabel && (
        <text
          x={x + w / 2}
          y={y + h + 14}
          textAnchor="middle"
          className={note}
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

/* =====================================================================
   1. Pointer → value (pointers page)
   ===================================================================== */
function PointerToValueDiagram() {
  return (
    <DiagramFrame
      viewBox="0 0 420 130"
      ariaLabel="A pointer variable p containing the address 0x4000 with an arrow to a value box x = 42 at that address"
    >
      <text x="0" y="14" className={groupTitle}>POINTER</text>
      <text x="240" y="14" className={groupTitle}>VALUE IN MEMORY</text>

      <Box x={0} y={30} w={170} h={60} tone="cyan" value="p = 0x4000" sublabel="8 bytes" />

      <line
        className={`${arrow} tone-cyan`}
        x1="170"
        y1="60"
        x2="240"
        y2="60"
        markerEnd="url(#diag-arrow-cyan)"
      />

      <Box x={240} y={30} w={170} h={60} tone="amber" value="x = 42" sublabel="4 bytes" />
      <text x="325" y="22" textAnchor="middle" className={note}>at 0x4000</text>
    </DiagramFrame>
  );
}

/* =====================================================================
   2. Array memory layout (arrays beginner)
   ===================================================================== */
function ArrayMemoryDiagram() {
  const values = [91, 84, 78, 66, 100];
  const addrs = ["0x40", "0x44", "0x48", "0x4C", "0x50"];
  const cellW = 70;
  const startX = 30;

  return (
    <DiagramFrame
      viewBox="0 0 410 170"
      ariaLabel="An array of five 4-byte integers with indices 0 to 4, values 91 84 78 66 100, and ascending memory addresses 0x40 0x44 0x48 0x4C 0x50"
    >
      <text x="0" y="30" className={cellLabel}>index</text>
      <text x="0" y="80" className={cellLabel}>value</text>
      <text x="0" y="135" className={cellLabel}>addr</text>

      {values.map((v, i) => (
        <g key={i}>
          <text x={startX + i * cellW + cellW / 2} y="30" textAnchor="middle" className={note}>
            {i}
          </text>
          <rect
            x={startX + i * cellW}
            y="45"
            width={cellW - 4}
            height="50"
            className={`${cell} tone-cyan`}
            rx="3"
          />
          <text
            x={startX + i * cellW + (cellW - 4) / 2}
            y="78"
            textAnchor="middle"
            className={`${cellValue} tone-cyan`}
          >
            {v}
          </text>
          <text
            x={startX + i * cellW + (cellW - 4) / 2}
            y="115"
            textAnchor="middle"
            className={note}
          >
            {addrs[i]}
          </text>
        </g>
      ))}

      <text x="205" y="150" textAnchor="middle" className={note}>
        each cell is 4 bytes — total 20 bytes, contiguous
      </text>
    </DiagramFrame>
  );
}

/* =====================================================================
   3. Stack array vs heap-backed Vec (arrays intermediate)
   ===================================================================== */
function StackVsHeapArrayDiagram() {
  const stackVals = [10, 20, 30, 40];
  return (
    <DiagramFrame
      viewBox="0 0 760 280"
      ariaLabel="On the left, a stack array of four i32 values laid out as one contiguous block of 16 bytes. On the right, a Vec header on the stack with ptr, len 4, cap 8, and an arrow to a heap buffer holding 10 20 30 40."
    >
      {/* Left: stack array */}
      <text x="0" y="20" className={groupTitle}>STACK ARRAY [i32; 4]</text>
      <text x="0" y="40" className={note}>fixed size, on the stack</text>
      <text x="0" y="80" className={cellLabel}>STACK</text>

      {stackVals.map((v, i) => (
        <g key={i}>
          <rect
            x="0"
            y={95 + i * 40}
            width="180"
            height="38"
            className={`${cell} tone-cyan`}
            rx="3"
          />
          <text
            x="90"
            y={119 + i * 40}
            textAnchor="middle"
            className={`${cellValue} tone-cyan`}
          >
            {v}
          </text>
        </g>
      ))}
      <text x="0" y="270" className={note}>16 bytes total</text>

      {/* Divider */}
      <line x1="260" y1="0" x2="260" y2="280" className="diagram-divider" />

      {/* Right: dynamic array */}
      <text x="290" y="20" className={groupTitle}>DYNAMIC ARRAY  Vec&lt;i32&gt;</text>
      <text x="290" y="40" className={note}>size known at runtime, body on the heap</text>

      <text x="290" y="80" className={cellLabel}>STACK</text>
      <rect x="290" y="95" width="170" height="115" className={`${cell} tone-magenta`} rx="3" />
      <text x="302" y="120" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>ptr</text>
      <text x="302" y="150" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>len = 4</text>
      <text x="302" y="180" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>cap = 8</text>
      <text x="375" y="230" textAnchor="middle" className={note}>24-byte header</text>

      <text x="540" y="80" className={cellLabel}>HEAP</text>
      <line
        className={`${arrow} tone-magenta`}
        x1="335"
        y1="120"
        x2="540"
        y2="135"
        markerEnd="url(#diag-arrow-magenta)"
      />

      {stackVals.map((v, i) => (
        <g key={`heap-${i}`}>
          <rect
            x={540 + i * 50}
            y="115"
            width="48"
            height="40"
            className={`${cell} tone-magenta`}
            rx="3"
          />
          <text
            x={540 + i * 50 + 24}
            y="140"
            textAnchor="middle"
            className={`${cellValue} tone-magenta`}
          >
            {v}
          </text>
        </g>
      ))}
      <text x="640" y="175" textAnchor="middle" className={note}>body lives elsewhere</text>
    </DiagramFrame>
  );
}

/* =====================================================================
   4. Array vs linked list (cache locality, arrays advanced)
   ===================================================================== */
function ArrayVsLinkedListDiagram() {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const cellW = 50;
  return (
    <DiagramFrame
      viewBox="0 0 720 280"
      ariaLabel="An array of 8 integers in one 64-byte cache line at the top, fetched in a single load. Below, a linked list of 8 integers scattered in memory, requiring a cache miss for every step."
    >
      <text x="0" y="20" className={groupTitle}>ARRAY OF 8 ints — 64 bytes, one cache line</text>
      {arr.map((v, i) => (
        <g key={i}>
          <rect
            x={i * cellW}
            y="35"
            width={cellW - 2}
            height="45"
            className={`${cell} tone-lime`}
            rx="3"
          />
          <text
            x={i * cellW + (cellW - 2) / 2}
            y="64"
            textAnchor="middle"
            className={`${cellValue} tone-lime`}
          >
            {v}
          </text>
        </g>
      ))}
      <rect x="0" y="35" width={cellW * 8 - 2} height="45" className="diagram-cache-line" rx="3" />
      <text x="200" y="100" className={note}>one load fetches all eight values — zero cache misses</text>

      {/* Linked list */}
      <text x="0" y="150" className={groupTitle}>LINKED LIST of 8 ints — each node lives somewhere different</text>

      {arr.map((v, i) => {
        const x = 5 + i * 88;
        const y = 175 + (i % 2) * 40;
        return (
          <g key={`ll-${i}`}>
            <rect x={x} y={y} width="78" height="38" className={`${cell} tone-rose`} rx="3" />
            <text x={x + 16} y={y + 23} className={`${cellValue} tone-rose`} style={{ fontSize: "13px" }}>{v}</text>
            <line x1={x + 36} y1={y + 6} x2={x + 36} y2={y + 32} className="diagram-divider" />
            <text x={x + 56} y={y + 24} className={note} textAnchor="middle">ptr</text>
            {i < arr.length - 1 && (
              <line
                className={`${arrow} tone-mute`}
                x1={x + 76}
                y1={y + 19}
                x2={5 + (i + 1) * 88}
                y2={175 + ((i + 1) % 2) * 40 + 19}
                markerEnd="url(#diag-arrow-mute)"
              />
            )}
            <text x={x + 39} y={y + 52} textAnchor="middle" className={`${note} miss`}>
              miss
            </text>
          </g>
        );
      })}
    </DiagramFrame>
  );
}

/* =====================================================================
   5. Row-major vs column-major (arrays advanced)
   ===================================================================== */
function RowVsColumnMajorDiagram() {
  const rowOrder = ["00", "01", "02", "10", "11", "12"];
  const colOrder = ["00", "10", "01", "11", "02", "12"];
  const cellW = 60;
  return (
    <DiagramFrame
      viewBox="0 0 460 280"
      ariaLabel="A two-by-three grid laid out two ways in memory. Row-major stores row 0 first then row 1. Column-major stores column 0 first then column 1 then column 2."
    >
      <text x="0" y="20" className={groupTitle}>ROW-MAJOR (C, Rust, NumPy default)</text>
      {rowOrder.map((c, i) => {
        const isRow1 = i >= 3;
        return (
          <g key={`row-${i}`}>
            <rect
              x={i * cellW}
              y="35"
              width={cellW - 2}
              height="50"
              className={`${cell} ${isRow1 ? "tone-magenta" : "tone-cyan"}`}
              rx="3"
            />
            <text
              x={i * cellW + (cellW - 2) / 2}
              y="66"
              textAnchor="middle"
              className={`${cellValue} ${isRow1 ? "tone-magenta" : "tone-cyan"}`}
            >
              {c}
            </text>
          </g>
        );
      })}
      <text x="0" y="105" className={note}>row 0 — then row 1</text>

      <text x="0" y="155" className={groupTitle}>COLUMN-MAJOR (Fortran, MATLAB, BLAS)</text>
      {colOrder.map((c, i) => {
        const col = Math.floor(i / 2);
        const tones: Tone[] = ["cyan", "amber", "lime"];
        return (
          <g key={`col-${i}`}>
            <rect
              x={i * cellW}
              y="170"
              width={cellW - 2}
              height="50"
              className={`${cell} tone-${tones[col]}`}
              rx="3"
            />
            <text
              x={i * cellW + (cellW - 2) / 2}
              y="201"
              textAnchor="middle"
              className={`${cellValue} tone-${tones[col]}`}
            >
              {c}
            </text>
          </g>
        );
      })}
      <text x="0" y="240" className={note}>col 0 — col 1 — col 2</text>

      <text x="0" y="270" className={note}>
        grid[i][j] in row-major = base + (i × num_cols + j) × sizeof(elem)
      </text>
    </DiagramFrame>
  );
}

/* =====================================================================
   6. Address space layout (memory page)
   ===================================================================== */
function AddressSpaceDiagram() {
  const regions: Array<{ name: string; tone: Tone; desc: string }> = [
    { name: "STACK", tone: "cyan", desc: "grows down · function locals, return addresses" },
    { name: "(free)", tone: "violet", desc: "gap between stack and heap" },
    { name: "HEAP", tone: "magenta", desc: "grows up · malloc / Box / Vec" },
    { name: "BSS", tone: "amber", desc: "uninitialised globals" },
    { name: "DATA", tone: "lime", desc: "initialised globals" },
    { name: "TEXT", tone: "azure", desc: "program instructions (read-only)" },
  ];
  return (
    <DiagramFrame
      viewBox="0 0 540 380"
      ariaLabel="A diagram of process address space from high addresses at the top to low addresses at the bottom. The stack grows downward, the heap grows upward toward it, with BSS, data, and text segments below."
    >
      <text x="0" y="16" className={note}>high addresses</text>

      {regions.map((r, i) => {
        const y = 30 + i * 55;
        return (
          <g key={r.name}>
            <rect x="0" y={y} width="240" height="48" className={`${cell} tone-${r.tone}`} rx="3" />
            <text x="120" y={y + 30} textAnchor="middle" className={`${cellValue} tone-${r.tone}`}>
              {r.name}
            </text>
            <text x="260" y={y + 30} className={note}>{r.desc}</text>
          </g>
        );
      })}

      {/* Arrows: stack grows down, heap grows up */}
      <line
        className={`${arrow} tone-cyan`}
        x1="120"
        y1="80"
        x2="120"
        y2="105"
        markerEnd="url(#diag-arrow-cyan)"
      />
      <line
        className={`${arrow} tone-magenta`}
        x1="120"
        y1="190"
        x2="120"
        y2="165"
        markerEnd="url(#diag-arrow-magenta)"
      />

      <text x="0" y="370" className={note}>low addresses</text>
    </DiagramFrame>
  );
}

/* =====================================================================
   7. Primitive vs dynamic (variables page)
   ===================================================================== */
function PrimitiveVsDynamicDiagram() {
  return (
    <DiagramFrame
      viewBox="0 0 720 320"
      ariaLabel="Top: a Point struct with x and y stored entirely on the stack in 16 bytes. Bottom: a String with a 24-byte header on the stack containing ptr, len 12, cap 16, with an arrow to a heap buffer holding the bytes of 'hello, world'."
    >
      {/* Primitive */}
      <text x="0" y="20" className={groupTitle}>PRIMITIVE — Point {`{ x: f64, y: f64 }`}</text>
      <text x="0" y="50" className={cellLabel}>STACK</text>

      <rect x="0" y="60" width="280" height="60" className={`${cell} tone-cyan`} rx="3" />
      <text x="20" y="95" className={`${cellValue} tone-cyan`} style={{ fontSize: "13px" }}>x = 3.14</text>
      <text x="160" y="95" className={`${cellValue} tone-cyan`} style={{ fontSize: "13px" }}>y = 2.71</text>
      <text x="0" y="140" className={note}>all 16 bytes on the stack — no allocator, no pointer chase</text>

      {/* Divider */}
      <line x1="0" y1="165" x2="720" y2="165" className="diagram-divider" />

      {/* Dynamic */}
      <text x="0" y="190" className={groupTitle}>DYNAMIC — String &quot;hello, world&quot;</text>

      <text x="0" y="215" className={cellLabel}>STACK</text>
      <rect x="0" y="225" width="180" height="85" className={`${cell} tone-magenta`} rx="3" />
      <text x="10" y="247" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>ptr</text>
      <text x="10" y="270" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>len = 12</text>
      <text x="10" y="293" className={`${cellValue} tone-magenta`} style={{ fontSize: "13px" }}>cap = 16</text>

      <text x="260" y="215" className={cellLabel}>HEAP</text>
      <line
        className={`${arrow} tone-magenta`}
        x1="60"
        y1="247"
        x2="260"
        y2="260"
        markerEnd="url(#diag-arrow-magenta)"
      />

      {"hello, world".split("").map((ch, i) => (
        <g key={`s-${i}`}>
          <rect
            x={260 + i * 30}
            y="240"
            width="28"
            height="40"
            className={`${cell} tone-magenta`}
            rx="2"
          />
          <text
            x={260 + i * 30 + 14}
            y="265"
            textAnchor="middle"
            className={`${cellValue} tone-magenta`}
            style={{ fontSize: "13px" }}
          >
            {ch === " " ? "·" : ch}
          </text>
        </g>
      ))}

      <text x="0" y="320" className={note}>24-byte header on stack — buffer lives elsewhere</text>
    </DiagramFrame>
  );
}

/* =====================================================================
   8. Struct padding (variables page)
   ===================================================================== */
function StructPaddingDiagram() {
  const offsets = Array.from({ length: 12 }, (_, i) => i);
  const bad = [
    { tone: "cyan" as Tone, label: "a" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "lime" as Tone, label: "c" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "mute" as Tone, label: "—" },
  ];
  const good = [
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "magenta" as Tone, label: "b" },
    { tone: "cyan" as Tone, label: "a" },
    { tone: "lime" as Tone, label: "c" },
    { tone: "mute" as Tone, label: "—" },
    { tone: "mute" as Tone, label: "—" },
  ];
  const cellW = 40;
  return (
    <DiagramFrame
      viewBox="0 0 540 320"
      ariaLabel="A struct laid out two ways. The Bad layout has u8 a, u32 b, u8 c and takes 12 bytes with 6 bytes of padding. The Good layout reorders to u32 b, u8 a, u8 c and fits in 8 bytes with only 2 bytes of padding."
    >
      <text x="0" y="20" className={groupTitle}>
        struct Bad &nbsp;{`{ u8 a; u32 b; u8 c; }`} &nbsp;→&nbsp; <tspan className="tone-rose">12 bytes</tspan>
      </text>
      <text x="0" y="45" className={cellLabel}>offset</text>
      {offsets.map((o) => (
        <text
          key={`bo-${o}`}
          x={60 + o * cellW + cellW / 2}
          y="45"
          textAnchor="middle"
          className={note}
        >
          {o}
        </text>
      ))}
      {bad.map((b, i) => (
        <g key={`b-${i}`}>
          <rect
            x={60 + i * cellW}
            y="55"
            width={cellW - 2}
            height="42"
            className={`${cell} tone-${b.tone}`}
            rx="2"
          />
          <text
            x={60 + i * cellW + (cellW - 2) / 2}
            y="80"
            textAnchor="middle"
            className={`${cellValue} tone-${b.tone}`}
          >
            {b.label}
          </text>
        </g>
      ))}
      <text x="60" y="118" className={note}>1 byte a — 3 bytes padding — 4 bytes b — 1 byte c — 3 bytes padding</text>

      <line x1="0" y1="150" x2="540" y2="150" className="diagram-divider" />

      <text x="0" y="180" className={groupTitle}>
        struct Good {`{ u32 b; u8 a; u8 c; }`} &nbsp;→&nbsp; <tspan className="tone-lime">8 bytes</tspan>
      </text>
      <text x="0" y="205" className={cellLabel}>offset</text>
      {offsets.slice(0, 8).map((o) => (
        <text
          key={`go-${o}`}
          x={60 + o * cellW + cellW / 2}
          y="205"
          textAnchor="middle"
          className={note}
        >
          {o}
        </text>
      ))}
      {good.map((b, i) => (
        <g key={`g-${i}`}>
          <rect
            x={60 + i * cellW}
            y="215"
            width={cellW - 2}
            height="42"
            className={`${cell} tone-${b.tone}`}
            rx="2"
          />
          <text
            x={60 + i * cellW + (cellW - 2) / 2}
            y="240"
            textAnchor="middle"
            className={`${cellValue} tone-${b.tone}`}
          >
            {b.label}
          </text>
        </g>
      ))}
      <text x="60" y="278" className={note}>4 bytes b — 1 byte a — 1 byte c — 2 bytes padding</text>
      <text x="0" y="310" className={note}>same fields, smaller footprint — order matters</text>
    </DiagramFrame>
  );
}

/* =====================================================================
   9. Kernel boundary (operating-system page)
   ===================================================================== */
function KernelBoundaryDiagram() {
  return (
    <DiagramFrame
      viewBox="0 0 640 360"
      ariaLabel="Three horizontal layers. The top layer is user space with three processes: your program, a shell, and a daemon. They funnel through a single syscall boundary into the kernel layer, which contains the scheduler, MMU, drivers, file systems and networking. The kernel sits on the hardware layer."
    >
      {/* User space */}
      <rect x="0" y="0" width="640" height="130" className="diagram-layer tone-cyan" rx="4" />
      <text x="14" y="22" className={`${groupTitle} tone-cyan`}>USER SPACE</text>

      <Box x={30} y={40} w={170} h={60} tone="cyan" label="your program" sublabel="printf, fork" />
      <Box x={230} y={40} w={170} h={60} tone="cyan" label="shell" sublabel="exec" />
      <Box x={430} y={40} w={170} h={60} tone="cyan" label="daemon" sublabel="read" />

      {/* Syscall arrows */}
      {[115, 315, 515].map((x, i) => (
        <line
          key={`sys-${i}`}
          className={`${arrow} tone-amber`}
          x1={x}
          y1="120"
          x2={x}
          y2="160"
          markerEnd="url(#diag-arrow-amber)"
        />
      ))}
      <text x="320" y="155" textAnchor="middle" className={`${note} tone-amber`}>
        syscall — one CPU instruction
      </text>

      {/* Kernel */}
      <rect x="0" y="170" width="640" height="100" className="diagram-layer tone-magenta" rx="4" />
      <text x="14" y="192" className={`${groupTitle} tone-magenta`}>KERNEL</text>
      <text x="320" y="220" textAnchor="middle" className={cellLabel}>
        scheduler · MMU · page tables · drivers
      </text>
      <text x="320" y="245" textAnchor="middle" className={cellLabel}>
        file systems · TCP/IP · signals · ipc
      </text>

      {/* Hardware */}
      <rect x="0" y="290" width="640" height="60" className="diagram-layer tone-lime" rx="4" />
      <text x="14" y="312" className={`${groupTitle} tone-lime`}>HARDWARE</text>
      <text x="320" y="332" textAnchor="middle" className={cellLabel}>
        CPU · memory · disk · NIC · GPU
      </text>
    </DiagramFrame>
  );
}

/* =====================================================================
   10. Fetch-execute flow (CPU page)
   ===================================================================== */
function FetchExecuteFlowDiagram() {
  const steps = [
    { label: "PC", tone: "cyan" as Tone },
    { label: "address bus", tone: "amber" as Tone },
    { label: "RAM", tone: "magenta" as Tone },
    { label: "data bus", tone: "amber" as Tone },
    { label: "instruction\nregister", tone: "cyan" as Tone },
    { label: "decode", tone: "lime" as Tone },
  ];
  const boxW = 100;
  const gap = 16;
  return (
    <DiagramFrame
      viewBox="0 0 720 110"
      ariaLabel="Fetch-execute flow: PC sends an address over the address bus to RAM, which sends the instruction back over the data bus to the instruction register, which is then decoded."
    >
      {steps.map((s, i) => {
        const x = i * (boxW + gap);
        const lines = s.label.split("\n");
        return (
          <g key={i}>
            <rect
              x={x}
              y="30"
              width={boxW}
              height="50"
              className={`${cell} tone-${s.tone}`}
              rx="3"
            />
            {lines.map((line, li) => (
              <text
                key={li}
                x={x + boxW / 2}
                y={lines.length === 1 ? 60 : 52 + li * 16}
                textAnchor="middle"
                className={`${cellValue} tone-${s.tone}`}
                style={{ fontSize: "12px" }}
              >
                {line}
              </text>
            ))}
            {i < steps.length - 1 && (
              <line
                className={`${arrow} tone-mute`}
                x1={x + boxW}
                y1="55"
                x2={x + boxW + gap}
                y2="55"
                markerEnd="url(#diag-arrow-mute)"
              />
            )}
          </g>
        );
      })}
    </DiagramFrame>
  );
}

/* =====================================================================
   Public API: <Diagram name="..." />
   ===================================================================== */
const REGISTRY: Record<DiagramName, () => React.ReactElement> = {
  "pointer-to-value": PointerToValueDiagram,
  "array-memory": ArrayMemoryDiagram,
  "stack-vs-heap-array": StackVsHeapArrayDiagram,
  "array-vs-linked-list": ArrayVsLinkedListDiagram,
  "row-vs-column-major": RowVsColumnMajorDiagram,
  "address-space": AddressSpaceDiagram,
  "primitive-vs-dynamic": PrimitiveVsDynamicDiagram,
  "struct-padding": StructPaddingDiagram,
  "kernel-boundary": KernelBoundaryDiagram,
  "fetch-execute-flow": FetchExecuteFlowDiagram,
};

export function Diagram({ name, caption: cap }: { name: DiagramName; caption?: string }) {
  const Component = REGISTRY[name];
  if (!Component) return null;
  return (
    <div className="diagram-wrap">
      <Component />
      {cap && <p className="diagram-extra-caption">{cap}</p>}
    </div>
  );
}
