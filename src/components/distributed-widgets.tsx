"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WidgetName } from "@/types/content";

interface NodePos {
  id: number;
  x: number;
  y: number;
}

function ringPositions(n: number, cx: number, cy: number, r: number): NodePos[] {
  return Array.from({ length: n }, (_, i) => {
    const theta = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { id: i, x: cx + Math.cos(theta) * r, y: cy + Math.sin(theta) * r };
  });
}

/* =====================================================================
   1. Gossip network: click a node, watch a message propagate outward
   ===================================================================== */
function GossipNetworkWidget() {
  const nodes = useMemo(() => ringPositions(6, 240, 175, 120), []);
  const peers = useMemo(() => {
    const map: number[][] = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      map[i].push((i + 1) % nodes.length);
      map[i].push((i + 2) % nodes.length);
      map[i].push((i + nodes.length - 1) % nodes.length);
    }
    return map;
  }, [nodes]);

  const [infected, setInfected] = useState<Set<number>>(new Set());
  const [inflight, setInflight] = useState<Array<{ from: number; to: number; key: string }>>([]);
  const [origin, setOrigin] = useState<number | null>(null);

  const propagate = useCallback(
    (start: number) => {
      setInfected(new Set([start]));
      setInflight([]);
      setOrigin(start);

      const queue: Array<{ from: number; to: number; depth: number }> = peers[start].map((p) => ({
        from: start,
        to: p,
        depth: 1,
      }));
      const seen = new Set<number>([start]);

      const step = () => {
        const next = queue.shift();
        if (!next) return;
        if (seen.has(next.to)) {
          requestAnimationFrame(step);
          return;
        }
        seen.add(next.to);
        const key = `${next.from}->${next.to}-${performance.now()}`;
        setInflight((cur) => [...cur, { from: next.from, to: next.to, key }]);

        window.setTimeout(() => {
          setInflight((cur) => cur.filter((m) => m.key !== key));
          setInfected((cur) => new Set([...cur, next.to]));
          peers[next.to].forEach((p) => {
            if (!seen.has(p)) {
              queue.push({ from: next.to, to: p, depth: next.depth + 1 });
            }
          });
          window.setTimeout(step, 80);
        }, 700);
      };
      window.setTimeout(step, 100);
    },
    [peers],
  );

  const reset = useCallback(() => {
    setInfected(new Set());
    setInflight([]);
    setOrigin(null);
  }, []);

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// gossip propagation"}</span>
        <div className="widget-controls">
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      <svg className="widget-canvas" viewBox="0 0 480 350" role="img" aria-label="A ring of six network nodes. Click any node to broadcast a message and watch it propagate to its peers.">
        {/* peer edges (background) */}
        {nodes.map((n) =>
          peers[n.id]
            .filter((p) => p > n.id)
            .map((p) => (
              <line
                key={`e-${n.id}-${p}`}
                x1={n.x}
                y1={n.y}
                x2={nodes[p].x}
                y2={nodes[p].y}
                stroke="var(--line-strong)"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            )),
        )}

        {/* in-flight messages */}
        {inflight.map((m) => {
          const from = nodes[m.from];
          const to = nodes[m.to];
          return (
            <g key={m.key}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--neon-cyan)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity={0.5}
              />
              <circle r="6" className="widget-message">
                <animate attributeName="cx" from={from.x} to={to.x} dur="0.7s" fill="freeze" />
                <animate attributeName="cy" from={from.y} to={to.y} dur="0.7s" fill="freeze" />
              </circle>
            </g>
          );
        })}

        {/* nodes */}
        {nodes.map((n) => {
          const hit = infected.has(n.id);
          const isOrigin = origin === n.id;
          const fill = hit ? (isOrigin ? "var(--neon-cyan)" : "var(--neon-indigo)") : "var(--bg-2)";
          const stroke = hit ? (isOrigin ? "var(--neon-cyan)" : "var(--neon-indigo)") : "var(--fg-mute)";
          return (
            <g key={n.id} onClick={() => propagate(n.id)} className="widget-node">
              <circle cx={n.x} cy={n.y} r={26} fill={fill} stroke={stroke} strokeWidth="2" />
              <text
                x={n.x}
                y={n.y + 5}
                textAnchor="middle"
                fill={hit ? "var(--bg-0)" : "var(--fg)"}
                fontFamily="var(--font-mono)"
                fontSize="13"
                fontWeight="600"
              >
                N{n.id + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="widget-caption">
        click any node, it broadcasts to its three peers; each of those forwards to theirs; within a few hops every node has the message. no coordinator, just forwarding.
      </p>
    </div>
  );
}

/* =====================================================================
   2. CAP triangle: pick a system, see which two corners it chooses
   ===================================================================== */
type CapSystem = "bitcoin" | "rdb" | "cassandra";

const CAP_SYSTEMS: Record<CapSystem, { label: string; sides: ["CA" | "CP" | "AP"]; note: string }> = {
  rdb: {
    label: "Postgres (single-node)",
    sides: ["CA"],
    note: "consistency + availability when the network is fine; falls over on partition",
  },
  bitcoin: {
    label: "Bitcoin / blockchain",
    sides: ["CP"],
    note: "every node sees the same canonical chain; sacrifices availability under partition",
  },
  cassandra: {
    label: "Cassandra / DynamoDB",
    sides: ["AP"],
    note: "always serves a read or accepts a write; reconciles inconsistency later",
  },
};

function CapTriangleWidget() {
  const [pick, setPick] = useState<CapSystem>("bitcoin");
  const sides = CAP_SYSTEMS[pick].sides[0];

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// CAP theorem - pick any two"}</span>
        <div className="widget-controls">
          {(Object.keys(CAP_SYSTEMS) as CapSystem[]).map((sys) => (
            <button
              key={sys}
              type="button"
              className={`widget-btn ${pick === sys ? "is-active" : ""}`}
              onClick={() => setPick(sys)}
            >
              {CAP_SYSTEMS[sys].label}
            </button>
          ))}
        </div>
      </div>

      <svg className="widget-canvas" viewBox="0 0 480 320" role="img" aria-label="A triangle with vertices labelled Consistency, Availability, Partition Tolerance. The edge between the two vertices the selected system chooses is highlighted.">
        {/* vertices */}
        {(() => {
          const C = { x: 240, y: 60 };
          const A = { x: 90, y: 250 };
          const P = { x: 390, y: 250 };
          const edges: { from: { x: number; y: number }; to: { x: number; y: number }; key: "CA" | "CP" | "AP" }[] = [
            { from: C, to: A, key: "CA" },
            { from: C, to: P, key: "CP" },
            { from: A, to: P, key: "AP" },
          ];
          return (
            <>
              {edges.map((e) => (
                <line
                  key={e.key}
                  x1={e.from.x}
                  y1={e.from.y}
                  x2={e.to.x}
                  y2={e.to.y}
                  className={`cap-edge ${sides === e.key ? "is-chosen" : ""}`}
                />
              ))}

              {/* C */}
              <circle cx={C.x} cy={C.y} r={32} fill="var(--bg-2)" stroke="var(--neon-cyan)" strokeWidth="2" />
              <text x={C.x} y={C.y + 6} textAnchor="middle" className="cap-vertex" fill="var(--neon-cyan)">
                C
              </text>
              <text x={C.x} y={C.y - 46} textAnchor="middle" className="cap-vertex-desc">
                consistency
              </text>

              {/* A */}
              <circle cx={A.x} cy={A.y} r={32} fill="var(--bg-2)" stroke="var(--neon-lime)" strokeWidth="2" />
              <text x={A.x} y={A.y + 6} textAnchor="middle" className="cap-vertex" fill="var(--neon-lime)">
                A
              </text>
              <text x={A.x} y={A.y + 56} textAnchor="middle" className="cap-vertex-desc">
                availability
              </text>

              {/* P */}
              <circle cx={P.x} cy={P.y} r={32} fill="var(--bg-2)" stroke="var(--neon-magenta)" strokeWidth="2" />
              <text x={P.x} y={P.y + 6} textAnchor="middle" className="cap-vertex" fill="var(--neon-magenta)">
                P
              </text>
              <text x={P.x} y={P.y + 56} textAnchor="middle" className="cap-vertex-desc">
                partition tolerance
              </text>
            </>
          );
        })()}
      </svg>

      <p className="widget-caption">
        <strong style={{ color: "var(--neon-indigo)" }}>{CAP_SYSTEMS[pick].label}</strong>: {CAP_SYSTEMS[pick].note}.
      </p>
    </div>
  );
}

/* =====================================================================
   3. Network partition: split into two halves, watch them diverge, heal
   ===================================================================== */
function NetworkPartitionWidget() {
  const [partitioned, setPartitioned] = useState(false);
  const [leftValue, setLeftValue] = useState(7);
  const [rightValue, setRightValue] = useState(7);

  useEffect(() => {
    if (!partitioned) {
      // reconciled: whichever side has the newer write wins (here, "right" by convention)
      const winner = Math.max(leftValue, rightValue);
      setLeftValue(winner);
      setRightValue(winner);
    }
  }, [partitioned, leftValue, rightValue]);

  const leftCx = 130;
  const rightCx = 350;
  const cy = 175;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// network partition + reconciliation"}</span>
        <div className="widget-controls">
          <button
            type="button"
            className={`widget-btn ${partitioned ? "is-active" : ""}`}
            onClick={() => setPartitioned((p) => !p)}
          >
            {partitioned ? "heal partition" : "partition"}
          </button>
          {partitioned && (
            <>
              <button
                type="button"
                className="widget-btn"
                onClick={() => setLeftValue((v) => v + 1)}
              >
                write left+1
              </button>
              <button
                type="button"
                className="widget-btn"
                onClick={() => setRightValue((v) => v + 1)}
              >
                write right+1
              </button>
            </>
          )}
        </div>
      </div>

      <svg className="widget-canvas" viewBox="0 0 480 350" role="img" aria-label="Six nodes split into a left group of three and a right group of three. While partitioned, the two halves can be updated independently; when healed, they converge on one value.">
        {/* left group */}
        {[0, 1, 2].map((i) => {
          const x = leftCx - (partitioned ? 30 : 0) + (i % 2) * 40;
          const y = cy - 50 + i * 50;
          return (
            <g key={`l-${i}`}>
              <circle cx={x} cy={y} r={22} fill="var(--bg-2)" stroke="var(--neon-cyan)" strokeWidth="2" />
              <text x={x} y={y + 5} textAnchor="middle" fill="var(--neon-cyan)" fontFamily="var(--font-mono)" fontSize="13">
                {leftValue}
              </text>
            </g>
          );
        })}

        {/* right group */}
        {[0, 1, 2].map((i) => {
          const x = rightCx + (partitioned ? 30 : 0) + (i % 2) * 40;
          const y = cy - 50 + i * 50;
          return (
            <g key={`r-${i}`}>
              <circle cx={x} cy={y} r={22} fill="var(--bg-2)" stroke="var(--neon-magenta)" strokeWidth="2" />
              <text x={x} y={y + 5} textAnchor="middle" fill="var(--neon-magenta)" fontFamily="var(--font-mono)" fontSize="13">
                {rightValue}
              </text>
            </g>
          );
        })}

        {/* bridge: dashed lightning when partitioned, solid when healed */}
        <line
          x1={leftCx + 60}
          y1={cy}
          x2={rightCx - 30}
          y2={cy}
          stroke={partitioned ? "var(--neon-rose)" : "var(--neon-lime)"}
          strokeWidth="2"
          strokeDasharray={partitioned ? "5 8" : "0"}
          opacity={0.7}
        />
        {partitioned && (
          <text
            x={(leftCx + rightCx) / 2}
            y={cy - 12}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fill="var(--neon-rose)"
          >
            PARTITION
          </text>
        )}
      </svg>

      <p className="widget-caption">
        partition the network, then write on either side - values diverge. heal the partition and the system reconciles (here: highest value wins; real CRDTs use more sophisticated merge rules).
      </p>
    </div>
  );
}

/* =====================================================================
   4. Bit toggle: click bits, see the number they spell out
   ===================================================================== */
const BIT_PRESETS: Array<{ label: string; value: number; note?: { text: string; href: string } }> = [
  { label: "Try: 10", value: 10 },
  {
    label: "Try: 72 = 'H'",
    value: 72,
    note: { text: "This is the letter H in ASCII", href: "/ascii" },
  },
  { label: "Try: 255", value: 255 },
  { label: "Try: 42", value: 42 },
];

function bitsOf(n: number): boolean[] {
  // MSB on the left, LSB on the right
  return Array.from({ length: 8 }, (_, i) => ((n >> (7 - i)) & 1) === 1);
}

function valueOf(bits: boolean[]): number {
  return bits.reduce((acc, b, i) => acc + (b ? 1 << (7 - i) : 0), 0);
}

function BitToggleWidget() {
  const [bits, setBits] = useState<boolean[]>(bitsOf(72));
  const [activePreset, setActivePreset] = useState<number | null>(72);

  const toggle = (i: number) => {
    setBits((cur) => cur.map((b, idx) => (idx === i ? !b : b)));
    setActivePreset(null);
  };

  const setFrom = (n: number) => {
    setBits(bitsOf(n));
    setActivePreset(n);
  };

  const value = valueOf(bits);
  const binStr = bits.map((b) => (b ? "1" : "0")).join("");
  const hexStr = value.toString(16).toUpperCase().padStart(2, "0");
  const contributions = bits
    .map((b, i) => (b ? 1 << (7 - i) : 0))
    .map((v) => String(v));
  const activeContributions = bits
    .map((b, i) => (b ? 1 << (7 - i) : 0))
    .filter((v) => v > 0);
  const activeNote = activePreset === 72 ? BIT_PRESETS[1].note : null;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// the bit toggle — click any bit"}</span>
        <div className="widget-controls">
          {BIT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`widget-btn ${activePreset === p.value ? "is-active" : ""}`}
              onClick={() => setFrom(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bit-row">
        {bits.map((b, i) => {
          const power = 7 - i;
          return (
            <button
              key={i}
              type="button"
              className={`bit-cell ${b ? "is-on" : ""}`}
              onClick={() => toggle(i)}
              aria-label={`bit at position 2^${power}, currently ${b ? "on" : "off"}`}
            >
              <span className="bit-power">2{["⁷", "⁶", "⁵", "⁴", "³", "²", "¹", "⁰"][i]}</span>
              <span className="bit-value">{b ? "1" : "0"}</span>
              <span className="bit-contrib">{b ? contributions[i] : "·"}</span>
            </button>
          );
        })}
      </div>

      <div className="bit-sum">
        <span className="bit-sum-eq">
          {(activeContributions.length > 0 ? activeContributions.join(" + ") : "0")} = {value}
        </span>
      </div>

      <div className="bit-readout">
        <div className="bit-readout-item">
          <span className="bit-readout-label">decimal</span>
          <span className="bit-readout-value bit-readout-big">{value}</span>
        </div>
        <div className="bit-readout-item">
          <span className="bit-readout-label">binary</span>
          <span className="bit-readout-value">{binStr}</span>
        </div>
        <div className="bit-readout-item">
          <span className="bit-readout-label">hex</span>
          <span className="bit-readout-value">0x{hexStr}</span>
        </div>
      </div>

      {activeNote && (
        <a className="bit-link-callout" href={activeNote.href}>
          → {activeNote.text}
        </a>
      )}

      <p className="widget-caption">
        click any bit to toggle it. the binary, decimal, and hex below all update in lockstep. they are three notations for the same eight switch-states.
      </p>
    </div>
  );
}

/* =====================================================================
   5. Character explorer: type one char, see decimal / hex / binary / bits
   ===================================================================== */
const CHAR_QUICK_PICKS: string[] = ["A", "a", "Z", "0", "9", " ", "H", "i"];

function CharExplorerWidget() {
  const [ch, setCh] = useState<string>("H");

  const code = ch.length > 0 ? ch.charCodeAt(0) : 0;
  const safe = code >= 0 && code <= 127;
  const bits = Array.from({ length: 8 }, (_, i) => ((code >> (7 - i)) & 1) === 1);
  const binStr = bits.map((b) => (b ? "1" : "0")).join("");
  const hexStr = code.toString(16).toUpperCase().padStart(2, "0");

  const note =
    ch === "H"
      ? {
          text: "this is the first byte of 'Hi'. the next page shows how your CPU processes this exact bit pattern.",
          href: "/cpu",
          linkLabel: "see: cpu",
        }
      : ch === " "
        ? {
            text: "space = 32 = 0x20 = 00100000. the same bit that separates uppercase from lowercase ('A' ^ 0x20 = 'a').",
            href: "/logic-gates",
            linkLabel: "see: logic gates",
          }
        : null;

  const display = ch === " " ? "␣" : ch || "?";

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// character explorer — type any letter"}</span>
        <div className="widget-controls">
          {CHAR_QUICK_PICKS.map((c) => (
            <button
              key={c}
              type="button"
              className={`widget-btn ${ch === c ? "is-active" : ""}`}
              onClick={() => setCh(c)}
            >
              {c === " " ? "space" : c}
            </button>
          ))}
        </div>
      </div>

      <div className="char-explorer">
        <div className="char-display">
          <div className="char-glyph">{display}</div>
          <input
            className="char-input"
            value={ch}
            maxLength={1}
            onChange={(e) => setCh(e.target.value.slice(-1))}
            aria-label="character"
            placeholder="H"
          />
        </div>

        <div className="char-readout">
          <div className="char-readout-item">
            <span className="char-readout-label">decimal</span>
            <span className="char-readout-value">{safe ? code : "?"}</span>
          </div>
          <div className="char-readout-item">
            <span className="char-readout-label">hex</span>
            <span className="char-readout-value">0x{hexStr}</span>
          </div>
          <div className="char-readout-item">
            <span className="char-readout-label">binary</span>
            <span className="char-readout-value">{binStr}</span>
          </div>
        </div>

        <div className="bit-row bit-row-sm">
          {bits.map((b, i) => {
            const power = 7 - i;
            return (
              <div key={i} className={`bit-cell bit-cell-sm ${b ? "is-on" : ""}`}>
                <span className="bit-power">2{["⁷", "⁶", "⁵", "⁴", "³", "²", "¹", "⁰"][i]}</span>
                <span className="bit-value">{b ? "1" : "0"}</span>
                <span className="bit-contrib">{b ? String(1 << power) : "·"}</span>
              </div>
            );
          })}
        </div>

        <p className="char-tag">8 transistors in your CPU, in one of 256 patterns.</p>

        {note && (
          <a className="bit-link-callout" href={note.href}>
            {note.text} <span style={{ opacity: 0.7 }}>·</span> {note.linkLabel} →
          </a>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   6. Text encoder: type a word, see each character as bytes/bits
   ===================================================================== */
const TEXT_PRESETS = ["Hello", "BitRoot", "ASCII", "Hi"];

function TextEncoderWidget() {
  const [text, setText] = useState<string>("Hello");

  const chars = text.split("").slice(0, 8);
  const totalBytes = chars.length;
  const totalBits = totalBytes * 8;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// text encoder — every character becomes 8 bits"}</span>
        <div className="widget-controls">
          {TEXT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`widget-btn ${text === p ? "is-active" : ""}`}
              onClick={() => setText(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <input
        className="text-encoder-input"
        value={text}
        maxLength={8}
        onChange={(e) => setText(e.target.value)}
        placeholder="Hello"
        aria-label="text to encode"
      />

      <div className="text-encoder-grid">
        {chars.length === 0 && (
          <p className="char-tag" style={{ gridColumn: "1 / -1" }}>
            type a word above to see it become bytes.
          </p>
        )}
        {chars.map((c, idx) => {
          const code = c.charCodeAt(0);
          const bits = Array.from({ length: 8 }, (_, i) => ((code >> (7 - i)) & 1) === 1);
          const display = c === " " ? "␣" : c;
          return (
            <div key={idx} className="text-encoder-card">
              <div className="text-encoder-glyph">{display}</div>
              <div className="text-encoder-meta">
                <span>{code}</span>
                <span className="text-encoder-bin">{bits.map((b) => (b ? "1" : "0")).join("")}</span>
              </div>
              <div className="text-encoder-bits">
                {bits.map((b, i) => (
                  <span key={i} className={`text-encoder-bit ${b ? "is-on" : ""}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-encoder-summary">
        {totalBytes} character{totalBytes === 1 ? "" : "s"} → {totalBits} bits → {totalBytes} byte{totalBytes === 1 ? "" : "s"} in memory.
      </p>
    </div>
  );
}

/* =====================================================================
   7. Gate simulator: toggle inputs, pick a gate, watch the output
   ===================================================================== */
type GateKind = "AND" | "OR" | "XOR" | "NOT" | "NAND";

const GATE_INFO: Record<
  GateKind,
  { mathSym: string; expr: (a: number, b: number) => string; eval: (a: number, b: number) => number; usesB: boolean }
> = {
  AND: {
    mathSym: "·",
    expr: () => "let out = a & b;",
    eval: (a, b) => a & b,
    usesB: true,
  },
  OR: {
    mathSym: "+",
    expr: () => "let out = a | b;",
    eval: (a, b) => a | b,
    usesB: true,
  },
  XOR: {
    mathSym: "⊕",
    expr: () => "let out = a ^ b;",
    eval: (a, b) => a ^ b,
    usesB: true,
  },
  NOT: {
    mathSym: "¬",
    expr: () => "let out = !a & 1;",
    eval: (a) => (a ? 0 : 1),
    usesB: false,
  },
  NAND: {
    mathSym: "·",
    expr: () => "let out = !(a & b) & 1;",
    eval: (a, b) => ((a & b) ? 0 : 1),
    usesB: true,
  },
};

function GateSimulatorWidget() {
  const [a, setA] = useState<0 | 1>(1);
  const [b, setB] = useState<0 | 1>(1);
  const [gate, setGate] = useState<GateKind>("AND");

  const info = GATE_INFO[gate];
  const out = info.eval(a, b);
  const usesB = info.usesB;

  const mathLine = usesB
    ? gate === "NAND"
      ? `${gate}: ¬(${a} · ${b}) = ${out}`
      : `${gate}: ${a} ${info.mathSym} ${b} = ${out}`
    : `${gate}: ¬${a} = ${out}`;

  const exprComment = usesB
    ? `// ${a} ${gate === "AND" || gate === "NAND" ? "&" : gate === "OR" ? "|" : "^"} ${b} = ${out}`
    : `// !${a} = ${out}`;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// try it — wire your own gate"}</span>
        <div className="widget-controls">
          {(Object.keys(GATE_INFO) as GateKind[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`widget-btn ${gate === g ? "is-active" : ""}`}
              onClick={() => setGate(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="gate-sim">
        <div className="gate-sim-inputs">
          <button
            type="button"
            className={`gate-input ${a ? "is-on" : ""}`}
            onClick={() => setA((v) => (v ? 0 : 1))}
          >
            <span className="gate-input-label">INPUT A</span>
            <span className="gate-input-bit">{a}</span>
          </button>

          <button
            type="button"
            className={`gate-input ${b ? "is-on" : ""} ${usesB ? "" : "is-disabled"}`}
            onClick={() => usesB && setB((v) => (v ? 0 : 1))}
            disabled={!usesB}
          >
            <span className="gate-input-label">INPUT B</span>
            <span className="gate-input-bit">{usesB ? b : "–"}</span>
          </button>
        </div>

        <div className="gate-sim-arrow" aria-hidden="true">
          →
        </div>

        <div className={`gate-output ${out ? "is-one" : "is-zero"}`}>
          <span className="gate-output-bit">{out}</span>
          <span className="gate-output-op">{mathLine}</span>
        </div>
      </div>

      <pre className="gate-sim-expr">
        <code>
          {info.expr(a, b)} {exprComment}
        </code>
      </pre>

      <p className="widget-caption">
        toggle the inputs, pick a gate. the output and the Rust expression update live. NOT ignores input B; everything else uses both.
      </p>
    </div>
  );
}

/* =====================================================================
   8. CAP visualiser: a live two-datacentre partition simulator
   ===================================================================== */
type CapPick = "CP" | "AP";

const START_BALANCE = 500;

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function CapVisualiserWidget() {
  const [connected, setConnected] = useState(true);
  const [choice, setChoice] = useState<CapPick>("CP");
  const [london, setLondon] = useState(START_BALANCE);
  const [ny, setNy] = useState(START_BALANCE);
  // balance captured at the moment of the cut, for reconciliation math
  const [partitionBase, setPartitionBase] = useState(START_BALANCE);
  const [diverged, setDiverged] = useState(false);
  const [amount, setAmount] = useState(300);
  const [log, setLog] = useState<Array<{ t: string; msg: string; tone: string }>>([
    { t: nowStamp(), msg: "both data centres online and synced at $500", tone: "ok" },
  ]);
  const [banner, setBanner] = useState<{ msg: string; tone: string } | null>(null);

  const addLog = (msg: string, tone: string) =>
    setLog((cur) => [{ t: nowStamp(), msg, tone }, ...cur].slice(0, 8));

  const cutNetwork = () => {
    setConnected(false);
    setPartitionBase(london); // london === ny while synced
    addLog("network partition: London and New York can no longer talk", "warn");
    setBanner({ msg: "Network partitioned. The theorem is now active.", tone: "warn" });
  };

  const restore = () => {
    if (choice === "AP" && diverged) {
      // reconcile
      const withdrawn = partitionBase - london + (partitionBase - ny);
      const finalBalance = partitionBase - withdrawn;
      if (finalBalance < 0) {
        addLog(
          `reconcile failed: $${withdrawn} withdrawn against a $${partitionBase} balance`,
          "bad",
        );
        setBanner({
          msg: `Conflict detected: total withdrawals ($${withdrawn}) exceed the original balance ($${partitionBase}). This is a double-spend.`,
          tone: "bad",
        });
        // leave balances diverged to show the damage
        setConnected(true);
        return;
      }
      setLondon(finalBalance);
      setNy(finalBalance);
      setDiverged(false);
      addLog(`reconciled: both servers agree on $${finalBalance}`, "ok");
      setBanner({ msg: `Reconciled successfully. Both servers now hold $${finalBalance}.`, tone: "ok" });
    } else {
      addLog("connection restored, servers in sync", "ok");
      setBanner({ msg: "Connection restored.", tone: "ok" });
    }
    setConnected(true);
  };

  const withdraw = (server: "london" | "ny") => {
    const amt = Math.max(0, Math.floor(amount) || 0);
    const label = server === "london" ? "London" : "New York";

    if (connected) {
      // synced: both copies update together
      const next = (server === "london" ? london : ny) - amt;
      if (next < 0) {
        addLog(`${label} rejected $${amt}: insufficient funds`, "bad");
        setBanner({ msg: "Insufficient funds.", tone: "bad" });
        return;
      }
      setLondon(next);
      setNy(next);
      addLog(`${label} withdrew $${amt}, replicated to both servers, balance $${next}`, "ok");
      setBanner({ msg: `Synced withdrawal applied to both servers. Balance $${next}.`, tone: "ok" });
      return;
    }

    // partitioned
    if (choice === "CP") {
      addLog(`${label} rejected $${amt}: cannot verify with primary server`, "warn");
      setBanner({
        msg: "Transaction rejected. Cannot verify with the primary server. The system is protecting data integrity.",
        tone: "warn",
      });
      return;
    }

    // AP: accept locally even though we cannot sync
    if (server === "london") {
      setLondon((v) => v - amt);
    } else {
      setNy((v) => v - amt);
    }
    setDiverged(true);
    addLog(`${label} accepted $${amt} locally, servers now diverged`, "warn");
    setBanner({
      msg: "System accepted the transaction. Warning: the servers have diverged. They will reconcile when the connection restores.",
      tone: "warn",
    });
  };

  const reset = () => {
    setConnected(true);
    setLondon(START_BALANCE);
    setNy(START_BALANCE);
    setPartitionBase(START_BALANCE);
    setDiverged(false);
    setBanner(null);
    setLog([{ t: nowStamp(), msg: "reset: both data centres synced at $500", tone: "ok" }]);
  };

  const status = connected ? "ONLINE" : "PARTITIONED";

  return (
    <div className="widget-wrap cap-vis">
      <div className="widget-head">
        <span className="widget-title">{"// CAP visualiser — cut the network and choose a side"}</span>
        <div className="widget-controls">
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      {/* two data centres */}
      <div className="cap-dc-row">
        <div className={`cap-dc ${connected ? "is-online" : "is-partitioned"} ${diverged ? "is-diverged" : ""}`}>
          <div className="cap-dc-head">
            <span className="cap-dc-name">Data Centre A · London</span>
            <span className={`cap-dc-badge ${connected ? "ok" : "warn"}`}>{status}</span>
          </div>
          <div className="cap-dc-balance">${london}</div>
          <div className="cap-dc-sub">{connected ? "synced" : choice === "CP" ? "locked" : diverged ? "local only" : "synced"}</div>
        </div>

        <div className="cap-link">
          <div className={`cap-link-line ${connected ? "is-up" : "is-down"}`} />
          <button
            type="button"
            className={`cap-link-btn ${connected ? "" : "is-cut"}`}
            onClick={connected ? cutNetwork : restore}
          >
            {connected ? "cut the network" : choice === "AP" && diverged ? "restore + reconcile" : "restore connection"}
          </button>
        </div>

        <div className={`cap-dc ${connected ? "is-online" : "is-partitioned"} ${diverged ? "is-diverged" : ""}`}>
          <div className="cap-dc-head">
            <span className="cap-dc-name">Data Centre B · New York</span>
            <span className={`cap-dc-badge ${connected ? "ok" : "warn"}`}>{status}</span>
          </div>
          <div className="cap-dc-balance">${ny}</div>
          <div className="cap-dc-sub">{connected ? "synced" : choice === "CP" ? "locked" : diverged ? "stale" : "synced"}</div>
        </div>
      </div>

      {/* CAP choice */}
      <div className="cap-choice">
        <span className="cap-choice-label">when partitioned, choose:</span>
        <div className="cap-choice-btns">
          <button
            type="button"
            className={`widget-btn ${choice === "CP" ? "is-active" : ""}`}
            onClick={() => setChoice("CP")}
          >
            choose consistency (CP)
          </button>
          <button
            type="button"
            className={`widget-btn ${choice === "AP" ? "is-active" : ""}`}
            onClick={() => setChoice("AP")}
          >
            choose availability (AP)
          </button>
        </div>
      </div>

      {/* transactions */}
      <div className="cap-txn">
        <label className="cap-txn-amount">
          amount
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <button type="button" className="widget-btn" onClick={() => withdraw("london")}>
          withdraw from London
        </button>
        <button type="button" className="widget-btn" onClick={() => withdraw("ny")}>
          withdraw from New York
        </button>
      </div>

      {banner && <div className={`cap-banner ${banner.tone}`}>{banner.msg}</div>}

      {/* event log */}
      <div className="cap-log">
        <div className="cap-log-title">event log</div>
        {log.map((e, i) => (
          <div key={i} className={`cap-log-row ${e.tone}`}>
            <span className="cap-log-time">{e.t}</span>
            <span className="cap-log-msg">{e.msg}</span>
          </div>
        ))}
      </div>

      <p className="widget-caption">
        cut the network, pick CP or AP, then withdraw from each city. CP refuses during a partition (consistency wins). AP accepts on both sides and diverges (availability wins), then reconciles, or detects a double-spend, on restore.
      </p>
    </div>
  );
}

/* =====================================================================
   9. Fetch-decode-execute: step a toy CPU through a 5-instruction program
   ===================================================================== */
type Stage = "idle" | "fetch" | "decode" | "execute" | "halted";

const FDE_PROGRAM: Array<{ byte: number; asm: string }> = [
  { byte: 0b00100101, asm: "LOAD r0, 5" },
  { byte: 0b00101111, asm: "LOAD r1, 7" },
  { byte: 0b01100001, asm: "ADD  r0, r1" },
  { byte: 0b10100000, asm: "PRT  r0" },
  { byte: 0b00000000, asm: "HALT" },
];

const FDE_OPS: Record<number, string> = {
  0: "HALT",
  1: "LOAD",
  2: "MOV",
  3: "ADD",
  4: "SUB",
  5: "PRT",
};

const b8 = (n: number) => (n & 0xff).toString(2).padStart(8, "0");
const b3 = (n: number) => n.toString(2).padStart(3, "0");
const b2 = (n: number) => n.toString(2).padStart(2, "0");
const hx = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");

function FetchDecodeExecuteWidget() {
  const [pc, setPc] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [regs, setRegs] = useState<number[]>([0, 0, 0, 0]);
  const [changed, setChanged] = useState<number | null>(null);
  const [log, setLog] = useState<Array<{ addr: number; msg: string }>>([]);

  const pcRef = useRef(0);
  const regsRef = useRef<number[]>([0, 0, 0, 0]);
  const haltedRef = useRef(false);
  const busyRef = useRef(false);
  const runningRef = useRef(false);

  const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const append = (addr: number, msg: string) =>
    setLog((cur) => [...cur, { addr, msg }].slice(-30));

  const stepOnce = async () => {
    if (busyRef.current || haltedRef.current) return;
    const idx = pcRef.current;
    if (idx >= FDE_PROGRAM.length) return;
    busyRef.current = true;

    const { byte, asm } = FDE_PROGRAM[idx];
    const op = (byte >> 5) & 0b111;
    const dst = (byte >> 3) & 0b11;
    const src = byte & 0b111;

    setStage("fetch");
    append(idx, `FETCH: ${b8(byte)}`);
    await sleep(480);

    setStage("decode");
    append(idx, `DECODE: ${asm.replace(/\s+/g, " ")}`);
    await sleep(480);

    setStage("execute");
    const next = [...regsRef.current];
    let execMsg = "";
    switch (op) {
      case 1:
        next[dst] = src;
        execMsg = `r${dst} = ${src}`;
        setChanged(dst);
        break;
      case 2:
        next[dst] = next[src & 0b11];
        execMsg = `r${dst} = ${next[dst]}`;
        setChanged(dst);
        break;
      case 3:
        next[dst] = (next[dst] + next[src & 0b11]) & 0xff;
        execMsg = `r${dst} = ${next[dst]}`;
        setChanged(dst);
        break;
      case 4:
        next[dst] = (next[dst] - next[src & 0b11]) & 0xff;
        execMsg = `r${dst} = ${next[dst]}`;
        setChanged(dst);
        break;
      case 5:
        execMsg = `print r${dst} = ${regsRef.current[dst]}`;
        break;
      default:
        execMsg = "halt";
    }
    regsRef.current = next;
    setRegs(next);
    append(idx, `EXECUTE: ${execMsg}`);
    await sleep(480);

    if (op === 0) {
      haltedRef.current = true;
      setStage("halted");
    } else {
      pcRef.current = idx + 1;
      setPc(idx + 1);
      setStage("idle");
    }
    window.setTimeout(() => setChanged(null), 600);
    busyRef.current = false;
  };

  const runAll = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (!haltedRef.current && pcRef.current < FDE_PROGRAM.length && runningRef.current) {
      await stepOnce();
      await sleep(200);
    }
    runningRef.current = false;
  };

  const reset = () => {
    runningRef.current = false;
    busyRef.current = false;
    haltedRef.current = false;
    pcRef.current = 0;
    regsRef.current = [0, 0, 0, 0];
    setPc(0);
    setRegs([0, 0, 0, 0]);
    setStage("idle");
    setChanged(null);
    setLog([]);
  };

  // decode of the instruction currently under the head
  const atEnd = pc >= FDE_PROGRAM.length || stage === "halted";
  const cur = atEnd ? null : FDE_PROGRAM[pc];
  const op = cur ? (cur.byte >> 5) & 0b111 : 0;
  const dst = cur ? (cur.byte >> 3) & 0b11 : 0;
  const src = cur ? cur.byte & 0b111 : 0;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// step through a program"}</span>
        <div className="widget-controls">
          <button type="button" className="widget-btn" onClick={stepOnce}>
            step →
          </button>
          <button type="button" className="widget-btn" onClick={runAll}>
            run all
          </button>
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      <div className="fde-pc">program counter: <strong>{hx(pc < FDE_PROGRAM.length ? pc : FDE_PROGRAM.length - 1)}</strong></div>

      <div className="fde">
        {/* memory */}
        <div className="fde-col">
          <div className="fde-col-title">memory</div>
          {FDE_PROGRAM.map((row, i) => {
            const o = (row.byte >> 5) & 0b111;
            const d = (row.byte >> 3) & 0b11;
            const s = row.byte & 0b111;
            const asm =
              o === 0 ? "HALT" : o === 5 ? `PRT r${d}` : o === 3 || o === 4 || o === 2 ? `${FDE_OPS[o]} r${d}, r${s}` : `LOAD r${d}, ${s}`;
            return (
              <div key={i} className={`fde-mem ${i === pc && !atEnd ? "is-current" : ""}`}>
                <span className="fde-mem-addr">{hx(i)}</span>
                <span className="fde-mem-bin">{b8(row.byte)}</span>
                <span className="fde-mem-asm">{asm}</span>
              </div>
            );
          })}
        </div>

        {/* cpu stages */}
        <div className="fde-col">
          <div className="fde-col-title">cpu</div>
          <div className={`fde-stage fetch ${stage === "fetch" ? "is-active" : ""}`}>
            <span className="fde-stage-name">fetch</span>
            <span className="fde-stage-body">PC = {hx(pc < FDE_PROGRAM.length ? pc : FDE_PROGRAM.length - 1)}</span>
            <span className="fde-stage-sub">reading from memory…</span>
          </div>
          <div className={`fde-stage decode ${stage === "decode" ? "is-active" : ""}`}>
            <span className="fde-stage-name">decode</span>
            {cur ? (
              <>
                <span className="fde-stage-body">opcode: {b3(op)} = {FDE_OPS[op]}</span>
                <span className="fde-stage-sub">dst: {b2(dst)} = r{dst}{op === 1 ? `   ·   imm: ${b3(src)} = ${src}` : `   ·   src: ${b3(src)} = r${src}`}</span>
              </>
            ) : (
              <span className="fde-stage-sub">halted</span>
            )}
          </div>
          <div className={`fde-stage execute ${stage === "execute" ? "is-active" : ""}`}>
            <span className="fde-stage-name">execute</span>
            {cur ? (
              <>
                <span className="fde-stage-body">
                  {op === 1
                    ? `r${dst} ← ${src}`
                    : op === 3
                      ? `r${dst} ← r${dst} + r${src}`
                      : op === 4
                        ? `r${dst} ← r${dst} - r${src}`
                        : op === 5
                          ? `print r${dst}`
                          : op === 2
                            ? `r${dst} ← r${src}`
                            : "halt"}
                </span>
                <span className="fde-stage-sub">r{dst} = {b8(regs[dst])}</span>
              </>
            ) : (
              <span className="fde-stage-sub">program complete</span>
            )}
          </div>
        </div>

        {/* registers */}
        <div className="fde-col">
          <div className="fde-col-title">registers</div>
          {regs.map((v, i) => (
            <div key={i} className={`fde-reg ${changed === i ? "is-changed" : ""}`}>
              <span className="fde-reg-name">r{i}</span>
              <span className="fde-reg-bin">{b8(v)}</span>
              <span className="fde-reg-dec">({v})</span>
            </div>
          ))}
        </div>
      </div>

      {/* log */}
      <div className="fde-log">
        <div className="fde-log-title">event log</div>
        {log.length === 0 && <div className="fde-log-row dim">press step to begin.</div>}
        {log.map((e, i) => (
          <div key={i} className="fde-log-row">
            <span className="fde-log-addr">[{hx(e.addr)}]</span> {e.msg}
          </div>
        ))}
      </div>

      <p className="widget-caption">
        the exact program from the toy-CPU code below: LOAD r0 5, LOAD r1 7, ADD, print, halt. step through it one instruction at a time and watch fetch, decode, and execute light up in turn.
      </p>
    </div>
  );
}

/* =====================================================================
   10. PACELC simulator: feel the latency-vs-consistency tradeoff
   ===================================================================== */
type PacelcStrategy = "EL" | "EC";

function PacelcSimulatorWidget() {
  const [strategy, setStrategy] = useState<PacelcStrategy>("EL");
  const [primary, setPrimary] = useState(1000);
  const [replica, setReplica] = useState(1000);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ msg: string; tone: string } | null>(null);
  const [log, setLog] = useState<Array<{ strat: string; val: number; ms: number; stale: boolean }>>([]);

  const behind = replica !== primary;

  const updatePrimary = () => {
    const next = primary - 50;
    setPrimary(next);
    setBanner({
      msg: `Primary updated to $${next}. The replica still shows $${replica}, now behind.`,
      tone: "warn",
    });
  };

  const sendRead = () => {
    if (strategy === "EL") {
      const stale = replica !== primary;
      setLastMs(1);
      setLog((cur) => [{ strat: "EL", val: replica, ms: 1, stale }, ...cur].slice(0, 5));
      setBanner(
        stale
          ? { msg: `EL: returned local cache ($${replica}) in 1ms. Warning: primary has $${primary}.`, tone: "warn" }
          : { msg: `EL: returned local cache ($${replica}) in 1ms.`, tone: "ok" },
      );
    } else {
      setLastMs(52);
      setLog((cur) => [{ strat: "EC", val: primary, ms: 52, stale: false }, ...cur].slice(0, 5));
      setBanner({ msg: `EC: fetched from primary ($${primary}) in 52ms. Data is current and verified.`, tone: "ok" });
    }
  };

  const reset = () => {
    setPrimary(1000);
    setReplica(1000);
    setLastMs(null);
    setBanner(null);
    setLog([]);
  };

  const meterPct = lastMs === null ? 0 : Math.min(100, (lastMs / 60) * 100);

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// feel the tradeoff"}</span>
        <div className="widget-controls">
          <button
            type="button"
            className={`widget-btn ${strategy === "EL" ? "is-active" : ""}`}
            onClick={() => setStrategy("EL")}
          >
            EL · low latency
          </button>
          <button
            type="button"
            className={`widget-btn ${strategy === "EC" ? "is-active" : ""}`}
            onClick={() => setStrategy("EC")}
          >
            EC · consistent
          </button>
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      {/* two servers */}
      <div className="cap-dc-row">
        <div className="cap-dc is-online">
          <div className="cap-dc-head">
            <span className="cap-dc-name">Primary · source of truth</span>
            <span className="cap-dc-badge ok">ONLINE</span>
          </div>
          <div className="cap-dc-balance">${primary}</div>
          <div className="cap-dc-sub">always current</div>
        </div>

        <div className="cap-link">
          <div className={`cap-link-line ${behind ? "is-down" : "is-up"}`} />
          <span className="pacelc-sync">{behind ? "50ms behind" : "synced, just now"}</span>
          <button type="button" className="cap-link-btn" onClick={updatePrimary}>
            update primary
          </button>
        </div>

        <div className={`cap-dc ${behind ? "is-partitioned" : "is-online"}`}>
          <div className="cap-dc-head">
            <span className="cap-dc-name">Local replica · nearest server</span>
            <span className={`cap-dc-badge ${behind ? "warn" : "ok"}`}>{behind ? "STALE" : "SYNCED"}</span>
          </div>
          <div className="cap-dc-balance">${replica}</div>
          <div className="cap-dc-sub">{behind ? "behind the primary" : "matches primary"}</div>
        </div>
      </div>

      {/* request */}
      <div className="pacelc-send">
        <button type="button" className="widget-btn pacelc-send-btn" onClick={sendRead}>
          send read request →
        </button>
        <div className="pacelc-route">
          routes to <strong>{strategy === "EL" ? "local replica" : "primary"}</strong>
        </div>
      </div>

      {/* latency meter */}
      {lastMs !== null && (
        <div className="pacelc-meter">
          <div className="pacelc-meter-label">response time</div>
          <div className="pacelc-meter-track">
            <div
              className={`pacelc-meter-fill ${strategy === "EL" ? "fast" : "slow"}`}
              style={{ width: `${Math.max(4, meterPct)}%` }}
            />
          </div>
          <div className="pacelc-meter-val">{lastMs}ms</div>
        </div>
      )}

      {banner && <div className={`cap-banner ${banner.tone}`}>{banner.msg}</div>}

      {/* log */}
      <div className="cap-log">
        <div className="cap-log-title">request log</div>
        {log.length === 0 && <div className="cap-log-row">send a request to begin.</div>}
        {log.map((e, i) => (
          <div key={i} className={`cap-log-row ${e.stale ? "warn" : "ok"}`}>
            <span className="cap-log-time">{e.strat}</span>
            <span className="cap-log-msg">
              ${e.val} in {e.ms}ms{e.stale ? " · stale" : " · verified"}
            </span>
          </div>
        ))}
      </div>

      <p className="widget-caption">
        update the primary so the replica falls behind, then send reads under each strategy. EL answers from the nearest replica in 1ms (possibly stale); EC verifies with the primary in 52ms (always correct). networks rarely partition, but every request still chooses EL or EC.
      </p>
    </div>
  );
}

/* =====================================================================
   11. Blockchain simulator: mine blocks, tamper the chain, watch it break
   ===================================================================== */
const BCS_DIFFICULTY = "0000"; // hash must start with this many hex zeros

// A small, fast, synchronous hash with a strong avalanche, used for the
// mineable chain. The standalone hash display below uses real SHA-256.
function bcsHash(input: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  const a = (h >>> 0).toString(16).padStart(8, "0");
  // mix a second word so the string looks hash-like (16 hex chars)
  let h2 = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h2 ^= h2 >>> 13;
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return a + b;
}

interface BcsBlock {
  index: number;
  data: string;
  prevHash: string;
  hash: string;
  nonce: number;
}

const BCS_GENESIS_PREV = "0000000000000000";

function bcsMine(index: number, prevHash: string, data: string): { nonce: number; hash: string } {
  let nonce = 0;
  for (;;) {
    const hash = bcsHash(`${index}|${prevHash}|${data}|${nonce}`);
    if (hash.startsWith(BCS_DIFFICULTY)) return { nonce, hash };
    nonce++;
  }
}

function bcsInitialChain(): BcsBlock[] {
  const g = bcsMine(0, BCS_GENESIS_PREV, "Genesis Block");
  const b0: BcsBlock = { index: 0, data: "Genesis Block", prevHash: BCS_GENESIS_PREV, hash: g.hash, nonce: g.nonce };
  const d1 = "Alice -> Bob : 1 BTC";
  const m1 = bcsMine(1, b0.hash, d1);
  const b1: BcsBlock = { index: 1, data: d1, prevHash: b0.hash, hash: m1.hash, nonce: m1.nonce };
  return [b0, b1];
}

function BlockchainSimulatorWidget() {
  const [blocks, setBlocks] = useState<BcsBlock[]>(bcsInitialChain);
  const [mining, setMining] = useState(false);
  const [attempt, setAttempt] = useState<{ nonce: number; hash: string } | null>(null);
  const [from, setFrom] = useState("Carol");
  const [to, setTo] = useState("Dave");
  const [amount, setAmount] = useState("2");

  const [hashText, setHashText] = useState("Bitcoin");
  const [sha, setSha] = useState("");

  // live SHA-256 of the text box, via SubtleCrypto when available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashText));
        if (!cancelled) {
          setSha(
            Array.from(new Uint8Array(buf))
              .map((x) => x.toString(16).padStart(2, "0"))
              .join(""),
          );
        }
      } else {
        setSha(bcsHash(hashText) + bcsHash(hashText.split("").reverse().join("")));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hashText]);

  const validity = blocks.map((b, i) => {
    const hashOk = b.hash.startsWith(BCS_DIFFICULTY);
    const linkOk = i === 0 ? b.prevHash === BCS_GENESIS_PREV : b.prevHash === blocks[i - 1].hash;
    return hashOk && linkOk;
  });

  const mineBlock = () => {
    if (mining) return;
    setMining(true);
    const index = blocks.length;
    const prevHash = blocks[blocks.length - 1].hash;
    const amt = amount.trim() || "0";
    const data = `${from.trim() || "?"} -> ${to.trim() || "?"} : ${amt} BTC`;
    let nonce = 0;
    const tick = () => {
      for (let i = 0; i < 1500; i++) {
        const hash = bcsHash(`${index}|${prevHash}|${data}|${nonce}`);
        if (hash.startsWith(BCS_DIFFICULTY)) {
          setBlocks((cur) => [...cur, { index, data, prevHash, hash, nonce }]);
          setAttempt({ nonce, hash });
          setMining(false);
          return;
        }
        nonce++;
      }
      setAttempt({ nonce, hash: bcsHash(`${index}|${prevHash}|${data}|${nonce}`) });
      window.setTimeout(tick, 16);
    };
    tick();
  };

  const tamperBlock1 = (newData: string) => {
    setBlocks((cur) =>
      cur.map((b, i) =>
        i === 1 ? { ...b, data: newData, hash: bcsHash(`1|${b.prevHash}|${newData}|${b.nonce}`) } : b,
      ),
    );
  };

  const remine = () => {
    setBlocks((cur) => {
      const next = [...cur];
      for (let i = 1; i < next.length; i++) {
        const prevHash = next[i - 1].hash;
        const { nonce, hash } = bcsMine(i, prevHash, next[i].data);
        next[i] = { ...next[i], prevHash, hash, nonce };
      }
      return next;
    });
  };

  const reset = () => {
    setBlocks(bcsInitialChain());
    setAttempt(null);
    setMining(false);
  };

  const short = (h: string) => `${h.slice(0, 8)}…`;
  const chainBroken = validity.some((v) => !v);

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// build the chain yourself"}</span>
        <div className="widget-controls">
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      <div className="bcs">
        {/* chain */}
        <div className="bcs-col">
          <div className="bcs-col-title">chain</div>
          {blocks.map((b, i) => (
            <div key={i} className={`bcs-block ${validity[i] ? "is-valid" : "is-invalid"}`}>
              <div className="bcs-block-head">
                <span>block #{b.index}</span>
                <span className={`bcs-badge ${validity[i] ? "ok" : "bad"}`}>
                  {validity[i] ? "VALID" : "INVALID"}
                </span>
              </div>
              <div className="bcs-block-row">data: {b.data}</div>
              <div className="bcs-block-row dim">prev: {short(b.prevHash)}</div>
              <div className="bcs-block-row hash">hash: {short(b.hash)}</div>
              <div className="bcs-block-row dim">nonce: {b.nonce}</div>
            </div>
          ))}
        </div>

        {/* mine */}
        <div className="bcs-col">
          <div className="bcs-col-title">mine a block</div>
          <div className="bcs-form">
            <label className="bcs-field">
              from
              <input value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="bcs-field">
              to
              <input value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="bcs-field">
              amount (BTC)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <button type="button" className="bcs-mine-btn" onClick={mineBlock} disabled={mining}>
              {mining ? "⛏ mining…" : "⛏ mine block"}
            </button>
          </div>
          {attempt && (
            <div className="bcs-attempt">
              <div>nonce: {attempt.nonce}</div>
              <div className={attempt.hash.startsWith(BCS_DIFFICULTY) ? "ok" : ""}>
                hash: {attempt.hash} {attempt.hash.startsWith(BCS_DIFFICULTY) ? "✓" : "✗"}
              </div>
              <div className="dim">target: {BCS_DIFFICULTY}… (hash must be smaller)</div>
            </div>
          )}
        </div>

        {/* tamper */}
        <div className="bcs-col">
          <div className="bcs-col-title">try to cheat</div>
          <p className="bcs-tamper-note">edit block #1&apos;s data and watch the chain break.</p>
          <textarea
            className="bcs-tamper-input"
            value={blocks[1]?.data ?? ""}
            onChange={(e) => tamperBlock1(e.target.value)}
            rows={2}
          />
          {chainBroken ? (
            <div className="bcs-warn">
              chain broken. a tampered block invalidates every block after it. its hash no longer starts with {BCS_DIFFICULTY}, and the next block&apos;s prev-hash no longer matches.
            </div>
          ) : (
            <div className="bcs-ok-note">chain intact. every hash links to the one before it.</div>
          )}
          <button type="button" className="widget-btn" onClick={remine}>
            re-mine from block #1
          </button>
          {chainBroken && (
            <p className="bcs-tamper-note">
              to fake this for real you would have to re-mine every later block faster than the honest network produces new ones. computationally impossible.
            </p>
          )}
        </div>
      </div>

      {/* live hash display */}
      <div className="bcs-hash">
        <div className="bcs-col-title">change one letter, see what happens</div>
        <input
          className="bcs-hash-input"
          value={hashText}
          onChange={(e) => setHashText(e.target.value)}
          placeholder="type any text"
        />
        <div className="bcs-hash-out">
          <span className="bcs-hash-label">SHA-256</span>
          <code>{sha}</code>
        </div>
      </div>

      <p className="widget-caption">
        mine a block (the nonce search runs live), then edit block #1 in the cheat panel and watch every block after it turn red. the hash box at the bottom is real SHA-256: change one character and the entire output changes. that avalanche is what makes the chain tamper-evident.
      </p>
    </div>
  );
}

/* =====================================================================
   12. Call-stack visualiser: watch recursion push and pop frames
   ===================================================================== */
type CsFn = "factorial" | "fibonacci" | "sum";
type FrameStatus = "calling" | "executing" | "base" | "returning";
interface CsFrame {
  label: string;
  status: FrameStatus;
  value: number | null;
  depth: number;
}
interface CsLog {
  msg: string;
  kind: "call" | "base" | "return" | "warn" | "overflow";
}
type CsEvent =
  | { t: "call"; label: string }
  | { t: "base"; label: string; value: number }
  | { t: "ret"; label: string; value: number; expr: string }
  | { t: "warn"; depth: number }
  | { t: "overflow" };

function csBuild(fn: CsFn, n: number): CsEvent[] {
  const ev: CsEvent[] = [];
  if (fn === "factorial") {
    const f = (k: number): number => {
      ev.push({ t: "call", label: `factorial(${k})` });
      if (k === 0) {
        ev.push({ t: "base", label: "factorial(0)", value: 1 });
        ev.push({ t: "ret", label: "factorial(0)", value: 1, expr: "returns 1" });
        return 1;
      }
      const sub = f(k - 1);
      const val = k * sub;
      ev.push({ t: "ret", label: `factorial(${k})`, value: val, expr: `returns ${k} × ${sub} = ${val}` });
      return val;
    };
    f(n);
  } else if (fn === "sum") {
    const f = (k: number): number => {
      ev.push({ t: "call", label: `sum(${k})` });
      if (k === 0) {
        ev.push({ t: "base", label: "sum(0)", value: 0 });
        ev.push({ t: "ret", label: "sum(0)", value: 0, expr: "returns 0" });
        return 0;
      }
      const sub = f(k - 1);
      const val = k + sub;
      ev.push({ t: "ret", label: `sum(${k})`, value: val, expr: `returns ${k} + ${sub} = ${val}` });
      return val;
    };
    f(n);
  } else {
    const f = (k: number): number => {
      ev.push({ t: "call", label: `fib(${k})` });
      if (k <= 1) {
        ev.push({ t: "base", label: `fib(${k})`, value: k });
        ev.push({ t: "ret", label: `fib(${k})`, value: k, expr: `returns ${k}` });
        return k;
      }
      const a = f(k - 1);
      const b = f(k - 2);
      const val = a + b;
      ev.push({ t: "ret", label: `fib(${k})`, value: val, expr: `returns ${a} + ${b} = ${val}` });
      return val;
    };
    f(n);
  }
  return ev;
}

function csBuildDanger(): CsEvent[] {
  const ev: CsEvent[] = [];
  for (let k = 1; k <= 50; k++) {
    ev.push({ t: "call", label: `recurse(${k})` });
    if (k === 20) ev.push({ t: "warn", depth: 20 });
  }
  ev.push({ t: "overflow" });
  return ev;
}

function csSnapshots(events: CsEvent[]): { snaps: CsFrame[][]; logs: CsLog[]; overflow: boolean } {
  const snaps: CsFrame[][] = [];
  const logs: CsLog[] = [];
  const stack: CsFrame[] = [];
  let overflow = false;
  const clone = () => stack.map((f) => ({ ...f }));

  for (const e of events) {
    if (e.t === "call") {
      stack.push({ label: e.label, status: "calling", value: null, depth: stack.length });
      snaps.push(clone());
      logs.push({ msg: `${e.label} called`, kind: "call" });
      stack[stack.length - 1].status = "executing";
    } else if (e.t === "base") {
      const top = stack[stack.length - 1];
      top.status = "base";
      top.value = e.value;
      snaps.push(clone());
      logs.push({ msg: `${e.label} BASE CASE, returns ${e.value}`, kind: "base" });
    } else if (e.t === "ret") {
      const top = stack[stack.length - 1];
      top.status = "returning";
      top.value = e.value;
      snaps.push(clone());
      logs.push({ msg: `${e.label} ${e.expr}`, kind: "return" });
      stack.pop();
    } else if (e.t === "warn") {
      snaps.push(clone());
      logs.push({ msg: `WARNING: stack growing without bound (depth ${e.depth})`, kind: "warn" });
    } else if (e.t === "overflow") {
      overflow = true;
      snaps.push(clone());
      logs.push({ msg: "STACK OVERFLOW. process terminated.", kind: "overflow" });
    }
  }
  return { snaps, logs, overflow };
}

function CallStackVisualiserWidget() {
  const [fn, setFn] = useState<CsFn>("factorial");
  const [n, setN] = useState(5);
  const [danger, setDanger] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  const { snaps, logs, overflow } = useMemo(
    () => csSnapshots(danger ? csBuildDanger() : csBuild(fn, n)),
    [fn, n, danger],
  );

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [fn, n, danger]);

  useEffect(() => {
    if (!playing) return;
    if (step >= snaps.length - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep((s) => Math.min(s + 1, snaps.length - 1)), speed);
    return () => window.clearTimeout(id);
  }, [playing, step, speed, snaps.length]);

  const frames = snaps[step] ?? [];
  const display = [...frames].reverse(); // newest on top
  const atEnd = step >= snaps.length - 1;
  const showOverflow = danger && overflow && atEnd;
  const showWarn = danger && frames.length >= 20 && !showOverflow;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// watch the stack grow and shrink"}</span>
        <div className="widget-controls">
          <button type="button" className="widget-btn" onClick={() => setStep((s) => Math.min(s + 1, snaps.length - 1))}>
            step →
          </button>
          <button type="button" className={`widget-btn ${playing ? "is-active" : ""}`} onClick={() => setPlaying((p) => !p)}>
            {playing ? "pause" : "run"}
          </button>
          <button
            type="button"
            className="widget-btn"
            onClick={() => {
              setStep(0);
              setPlaying(false);
            }}
          >
            reset
          </button>
        </div>
      </div>

      <div className="cs">
        {/* controls */}
        <div className="cs-controls">
          <label className="cs-field">
            function
            <select value={fn} disabled={danger} onChange={(e) => setFn(e.target.value as CsFn)}>
              <option value="factorial">factorial(n)</option>
              <option value="fibonacci">fibonacci(n)</option>
              <option value="sum">sum(n)</option>
            </select>
          </label>
          <label className="cs-field">
            n = {n}
            <input
              type="range"
              min={1}
              max={10}
              value={n}
              disabled={danger}
              onChange={(e) => setN(Number(e.target.value))}
            />
          </label>
          <label className="cs-field">
            speed
            <input type="range" min={120} max={1000} step={40} value={1120 - speed} onChange={(e) => setSpeed(1120 - Number(e.target.value))} />
          </label>
          <button
            type="button"
            className={`widget-btn ${danger ? "is-danger" : ""}`}
            onClick={() => setDanger((d) => !d)}
          >
            {danger ? "danger mode: ON" : "danger mode: off"}
          </button>
          <p className="cs-note">
            {danger
              ? "no base case. the stack just grows."
              : "step through the calls, or hit run."}
          </p>
        </div>

        {/* stack tower */}
        <div className="cs-stack-wrap">
          <div className="cs-col-title">call stack {showOverflow ? "" : `· depth ${frames.length}`}</div>
          {showOverflow && <div className="cs-overflow">💥 STACK OVERFLOW</div>}
          {showWarn && !showOverflow && <div className="cs-warnbar">⚠ stack growing without bound</div>}
          <div className="cs-stack">
            {display.length === 0 && <div className="cs-empty">stack empty. press step or run.</div>}
            {display.map((f, i) => (
              <div key={`${f.label}-${f.depth}-${i}`} className={`cs-frame ${f.status} ${danger ? "danger" : ""}`}>
                <span className="cs-frame-label">{f.label}</span>
                <span className="cs-frame-meta">
                  {f.status === "base"
                    ? "BASE CASE"
                    : f.status === "returning"
                      ? `→ ${f.value}`
                      : f.status === "calling"
                        ? "CALLING"
                        : `depth ${f.depth}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* log */}
      <div className="cs-log">
        <div className="cs-col-title">execution log</div>
        {logs.slice(0, step + 1).slice(-8).map((l, i) => (
          <div key={i} className={`cs-log-row ${l.kind}`}>
            {l.msg}
          </div>
        ))}
      </div>

      <p className="widget-caption">
        pick a function and an n, then step through it. each call pushes a frame; the green base case is where it finally stops; returns pop the frames back off. flip danger mode to remove the base case and watch the stack climb to overflow.
      </p>
    </div>
  );
}

/* =====================================================================
   13. Memory explorer: write a value, see the bytes land at an address
   ===================================================================== */
type MemType = "u8" | "u16" | "u32" | "char" | "string";
const MEM_BASE = 0x1000;

function memValueToBytes(type: MemType, raw: string, endian: "little" | "big"): number[] {
  if (type === "char") {
    return raw.length ? [raw.charCodeAt(0) & 0xff] : [];
  }
  if (type === "string") {
    return Array.from(raw).map((c) => c.charCodeAt(0) & 0xff);
  }
  const width = type === "u8" ? 1 : type === "u16" ? 2 : 4;
  const num = (Number(raw) || 0) >>> 0;
  const be: number[] = [];
  for (let i = width - 1; i >= 0; i--) be.push((num >>> (i * 8)) & 0xff);
  return endian === "big" ? be : be.reverse();
}

function MemoryExplorerWidget() {
  const [type, setType] = useState<MemType>("char");
  const [raw, setRaw] = useState("H");
  const [endian, setEndian] = useState<"little" | "big">("little");
  const [mem, setMem] = useState<number[]>(() => new Array(256).fill(0));
  const [selected, setSelected] = useState<number | null>(0);
  const [written, setWritten] = useState<[number, number] | null>([0, 0]);

  const write = (t: MemType, r: string, e: "little" | "big") => {
    const bytes = memValueToBytes(t, r, e);
    const next = new Array(256).fill(0);
    bytes.slice(0, 256).forEach((b, i) => (next[i] = b));
    setMem(next);
    setWritten(bytes.length ? [0, bytes.length - 1] : null);
    setSelected(0);
  };

  const onWrite = () => write(type, raw, endian);

  const quick = (t: MemType, r: string) => {
    setType(t);
    setRaw(r);
    write(t, r, endian);
  };

  const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
  const addr = (i: number) => "0x" + (MEM_BASE + i).toString(16).toUpperCase();
  const isWritten = (i: number) => written !== null && i >= written[0] && i <= written[1];
  const printable = (n: number) => (n >= 32 && n <= 126 ? String.fromCharCode(n) : null);

  const showEndianNote = type === "u16" || type === "u32";

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// explore memory like the CPU does"}</span>
        <div className="widget-controls">
          {(["char", "u8", "u16", "u32", "string"] as MemType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`widget-btn ${type === t ? "is-active" : ""}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mem">
        {/* write panel */}
        <div className="mem-write">
          <label className="cs-field">
            value to store ({type})
            <input value={raw} onChange={(e) => setRaw(e.target.value)} />
          </label>
          <button type="button" className="widget-btn" onClick={onWrite}>
            write to {addr(0)}
          </button>

          <div className="mem-endian">
            <span className="mem-endian-label">byte order</span>
            <div className="mem-endian-btns">
              <button
                type="button"
                className={`widget-btn ${endian === "little" ? "is-active" : ""}`}
                onClick={() => {
                  setEndian("little");
                  write(type, raw, "little");
                }}
              >
                little-endian (x86)
              </button>
              <button
                type="button"
                className={`widget-btn ${endian === "big" ? "is-active" : ""}`}
                onClick={() => {
                  setEndian("big");
                  write(type, raw, "big");
                }}
              >
                big-endian (network)
              </button>
            </div>
            {showEndianNote && (
              <p className="cs-note">
                {endian === "little"
                  ? "least significant byte first. 0xDEADBEEF stores as EF BE AD DE."
                  : "most significant byte first. 0xDEADBEEF stores as DE AD BE EF."}
              </p>
            )}
          </div>

          <div className="mem-quick">
            <span className="mem-endian-label">quick store</span>
            <div className="mem-quick-btns">
              <button type="button" className="widget-btn" onClick={() => quick("char", "H")}>
                &apos;H&apos;
              </button>
              <button type="button" className="widget-btn" onClick={() => quick("u8", "42")}>
                42
              </button>
              <button type="button" className="widget-btn" onClick={() => quick("u32", "0xDEADBEEF")}>
                0xDEADBEEF
              </button>
              <button type="button" className="widget-btn" onClick={() => quick("string", "Hello")}>
                &apos;Hello&apos;
              </button>
              <button type="button" className="widget-btn" onClick={() => quick("u8", "255")}>
                255
              </button>
            </div>
          </div>
        </div>

        {/* memory grid */}
        <div className="mem-view">
          <div className="cs-col-title">memory @ {addr(0)}</div>
          <div className="mem-grid">
            {mem.map((b, i) => (
              <button
                key={i}
                type="button"
                className={`mem-cell ${isWritten(i) ? "written" : ""} ${selected === i ? "selected" : ""}`}
                title={`${addr(i)}: 0x${hex2(b)} = ${b}${printable(b) ? ` = '${printable(b)}'` : ""} = ${b.toString(2).padStart(8, "0")}`}
                onClick={() => setSelected(i)}
              >
                {hex2(b)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* selected detail */}
      {selected !== null && (
        <div className="mem-detail">
          <div>
            <span className="mem-detail-label">address</span>
            <span className="mem-detail-val">{addr(selected)}</span>
          </div>
          <div>
            <span className="mem-detail-label">value</span>
            <span className="mem-detail-val">0x{hex2(mem[selected])}</span>
          </div>
          <div>
            <span className="mem-detail-label">decimal</span>
            <span className="mem-detail-val">{mem[selected]}</span>
          </div>
          <div>
            <span className="mem-detail-label">binary</span>
            <span className="mem-detail-val">{mem[selected].toString(2).padStart(8, "0")}</span>
          </div>
          <div>
            <span className="mem-detail-label">ascii</span>
            <span className="mem-detail-val">{printable(mem[selected]) ? `'${printable(mem[selected])}'` : "(non-printable)"}</span>
          </div>
        </div>
      )}

      <p className="widget-caption">
        pick a type, type a value, and write it to address {addr(0)}. the bytes light up cyan in the grid; click any cell to decode it as hex, decimal, binary, and ASCII. flip the byte order to see why 0xDEADBEEF lands as EF BE AD DE on your laptop.
      </p>
    </div>
  );
}

/* =====================================================================
   14. Big O race: watch complexity classes diverge as n grows
   ===================================================================== */
type BigOTone = "lime" | "cyan" | "violet" | "amber" | "rose" | "crimson";

interface BigOClass {
  key: string;
  label: string;
  ops: (n: number) => number;
  tone: BigOTone;
  real: string;
  limited?: boolean; // only meaningful for small n
}

const BIGO_CLASSES: BigOClass[] = [
  { key: "O(1)", label: "O(1) · array access", ops: () => 1, tone: "lime", real: "Hash map lookup in Bitcoin's UTXO set" },
  { key: "O(log n)", label: "O(log n) · binary search", ops: (n) => Math.max(1, Math.ceil(Math.log2(n))), tone: "cyan", real: "Binary search in a sorted array" },
  { key: "O(n)", label: "O(n) · linear search", ops: (n) => n, tone: "violet", real: "Reading every element once" },
  { key: "O(n log n)", label: "O(n log n) · merge sort", ops: (n) => Math.round(n * Math.max(1, Math.log2(n))), tone: "amber", real: "Sorting with merge sort" },
  { key: "O(n²)", label: "O(n²) · bubble sort", ops: (n) => n * n, tone: "rose", real: "Bubble sort on this input" },
  { key: "O(2ⁿ)", label: "O(2ⁿ) · brute force", ops: (n) => Math.pow(2, n), tone: "crimson", real: "Naive recursive Fibonacci", limited: true },
];

function fmtNum(x: number): string {
  if (!isFinite(x)) return "∞";
  if (x < 1e15) return Math.round(x).toLocaleString("en-US");
  return x.toExponential(2);
}

function fmtTime(ops: number): string {
  // assume 1e9 operations per second, so time in nanoseconds == ops
  if (!isFinite(ops) || ops > 1e30) return "longer than the universe has existed";
  const ns = ops;
  if (ns < 1000) return `${Math.round(ns)} ns`;
  if (ns < 1e6) return `${(ns / 1e3).toFixed(1)} µs`;
  if (ns < 1e9) return `${(ns / 1e6).toFixed(1)} ms`;
  const s = ns / 1e9;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
  if (s < 31536000) return `${(s / 86400).toFixed(1)} days`;
  return `${(s / 31536000).toExponential(1)} years`;
}

function BigORaceWidget() {
  const [n, setN] = useState(1000);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "O(1)": true,
    "O(log n)": true,
    "O(n)": true,
    "O(n log n)": true,
    "O(n²)": true,
    "O(2ⁿ)": false,
  });
  const [bitcoin, setBitcoin] = useState(false);

  const expoBlocked = n > 30;

  type Row = { key: string; label: string; tone: BigOTone; ops: number; real: string };
  const rows: Row[] = [];
  for (const c of BIGO_CLASSES) {
    if (!enabled[c.key]) continue;
    if (c.limited && expoBlocked) continue;
    rows.push({ key: c.key, label: c.label, tone: c.tone, ops: c.ops(n), real: c.real });
  }
  if (bitcoin) {
    rows.push({ key: "sha", label: "SHA-256 compute", tone: "lime", ops: 1, real: "Hash any block in nanoseconds" });
    rows.push({ key: "reverse", label: "Reverse SHA-256 · O(2²⁵⁶)", tone: "amber", ops: Math.pow(2, 256), real: "More operations than atoms in the universe" });
  }

  const maxLog = Math.max(...rows.map((r) => Math.log10(r.ops + 1)), 1);

  const toggle = (key: string) =>
    setEnabled((cur) => ({ ...cur, [key]: !cur[key] }));

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// race the algorithms"}</span>
        <div className="widget-controls">
          <button
            type="button"
            className={`widget-btn ${bitcoin ? "is-active" : ""}`}
            onClick={() => setBitcoin((b) => !b)}
          >
            🔐 bitcoin mode
          </button>
        </div>
      </div>

      <div className="bigo-controls">
        <label className="cs-field">
          n = {n.toLocaleString("en-US")}
          <input
            type="range"
            min={10}
            max={100000}
            step={10}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <div className="bigo-checks">
          {BIGO_CLASSES.map((c) => {
            const blocked = c.limited && expoBlocked;
            return (
              <button
                key={c.key}
                type="button"
                className={`bigo-check ${enabled[c.key] && !blocked ? "on" : ""} ${blocked ? "blocked" : ""}`}
                onClick={() => !blocked && toggle(c.key)}
                disabled={blocked}
                title={blocked ? "O(2ⁿ) is disabled above n = 30: the numbers stop fitting in the universe" : undefined}
              >
                {c.key}
              </button>
            );
          })}
        </div>
        {expoBlocked && (
          <p className="cs-note">O(2ⁿ) is hidden above n = 30. At n = 64 it already exceeds the number of atoms in the universe.</p>
        )}
      </div>

      <div className="bigo-bars">
        {rows.map((r) => (
          <div key={r.key} className="bigo-row">
            <div className="bigo-row-head">
              <span className="bigo-row-label">{r.label}</span>
              <span className="bigo-row-ops">{fmtNum(r.ops)} ops</span>
            </div>
            <div className="bigo-track">
              <div
                className={`bigo-fill tone-${r.tone}`}
                style={{ width: `${Math.max(2, (Math.log10(r.ops + 1) / maxLog) * 100)}%` }}
              />
            </div>
            <div className="bigo-row-foot">
              <span className="bigo-real">{r.real}</span>
              <span className="bigo-time">{fmtTime(r.ops)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="widget-caption">
        drag n and watch the bars diverge (widths are log-scaled so every class stays visible). times assume a billion operations per second. flip bitcoin mode to add SHA-256: O(1) to compute, O(2²⁵⁶) to reverse. that gap is the entire security model.
      </p>
    </div>
  );
}

/* =====================================================================
   15. Process Scheduler Visualiser
   ===================================================================== */
type ProcPriority = "HIGH" | "NORMAL" | "LOW";
type ProcState = "RUNNING" | "READY" | "WAITING" | "SLEEPING";
type SchedMode = "rr" | "priority" | "cfs";

interface OSProc {
  id: number;
  pid: number;
  name: string;
  priority: ProcPriority;
  state: ProcState;
  cpuTime: number;
  vrt: number;
  waitLeft: number;
}

interface OSCore {
  id: number;
  proc: OSProc | null;
  sliceUsed: number;
}

interface SchedLog {
  t: number;
  text: string;
}

const SCHED_TICK_MS = 350;
const SCHED_SLICE = 10;
const SCHED_LOG_MAX = 35;

function makeOSCore(id: number): OSCore {
  return { id, proc: null, sliceUsed: 0 };
}

function vrDelta(p: ProcPriority): number {
  return p === "HIGH" ? SCHED_SLICE / 2 : p === "NORMAL" ? SCHED_SLICE : SCHED_SLICE * 2;
}

function priNum(p: ProcPriority): number {
  return p === "HIGH" ? 3 : p === "NORMAL" ? 2 : 1;
}

function pickNextOSProc(
  procs: OSProc[],
  cores: OSCore[],
  mode: SchedMode,
  forCoreId: number,
  rrPtr: { v: number },
): OSProc | null {
  const busy = new Set(cores.filter((c) => c.id !== forCoreId && c.proc).map((c) => c.proc!.id));
  const ready = procs.filter((p) => p.state === "READY" && !busy.has(p.id));
  if (!ready.length) return null;
  if (mode === "rr") {
    const byId = [...ready].sort((a, b) => a.id - b.id);
    const after = byId.filter((p) => p.id > rrPtr.v);
    const chosen = after[0] ?? byId[0];
    rrPtr.v = chosen.id;
    return chosen;
  }
  if (mode === "priority") {
    return [...ready].sort((a, b) => priNum(b.priority) - priNum(a.priority))[0];
  }
  return [...ready].sort((a, b) => a.vrt - b.vrt)[0];
}

function ProcessSchedulerWidget() {
  const [isRunning, setIsRunning] = useState(false);
  const [scheduler, setScheduler] = useState<SchedMode>("rr");
  const [newName, setNewName] = useState("");
  const [newPri, setNewPri] = useState<ProcPriority>("NORMAL");

  type SimSnap = {
    t: number;
    procs: OSProc[];
    cores: OSCore[];
    log: SchedLog[];
    nextPid: number;
  };

  const simRef = useRef<{
    t: number;
    procs: OSProc[];
    cores: OSCore[];
    log: SchedLog[];
    nextPid: number;
    rrPtr: { v: number };
  }>({ t: 0, procs: [], cores: [makeOSCore(0), makeOSCore(1)], log: [], nextPid: 1001, rrPtr: { v: 0 } });

  const [snap, setSnap] = useState<SimSnap>({
    t: 0,
    procs: [],
    cores: [makeOSCore(0), makeOSCore(1)],
    log: [],
    nextPid: 1001,
  });

  const schedRef = useRef<SchedMode>("rr");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const syncSnap = useCallback(() => {
    const s = simRef.current;
    setSnap({
      t: s.t,
      procs: s.procs.map((p) => ({ ...p })),
      cores: s.cores.map((c) => ({ ...c, proc: c.proc ? { ...c.proc } : null })),
      log: [...s.log],
      nextPid: s.nextPid,
    });
  }, []);

  const doTick = useCallback(() => {
    const s = simRef.current;
    const mode = schedRef.current;
    if (s.procs.length === 0) return;

    s.t += SCHED_SLICE;

    const pushLog = (text: string) => {
      s.log.push({ t: s.t, text });
      if (s.log.length > SCHED_LOG_MAX) s.log.shift();
    };

    const procs: OSProc[] = s.procs.map((p) => ({ ...p }));
    const cores: OSCore[] = s.cores.map((c) => ({ ...c, proc: c.proc ? { ...c.proc } : null }));

    for (const p of procs) {
      if ((p.state === "WAITING" || p.state === "SLEEPING") && p.waitLeft > 0) {
        p.waitLeft--;
        if (p.waitLeft === 0) p.state = "READY";
      }
    }

    for (const p of procs) {
      if (p.state === "READY" && s.t > 10 && Math.random() < 0.06) {
        p.state = Math.random() < 0.6 ? "WAITING" : "SLEEPING";
        p.waitLeft = 2 + Math.floor(Math.random() * 4);
        pushLog(`[${s.t}ms] ${p.name}: ${p.state} (I/O blocked)`);
      }
    }

    for (const core of cores) {
      if (core.proc !== null) {
        const cur = procs.find((p) => p.id === core.proc!.id);

        if (!cur || cur.state === "WAITING" || cur.state === "SLEEPING") {
          const oldName = core.proc.name;
          core.proc = null;
          core.sliceUsed = 0;
          const next = pickNextOSProc(procs, cores, mode, core.id, s.rrPtr);
          if (next) {
            next.state = "RUNNING";
            core.proc = next;
            pushLog(`[${s.t}ms] Context switch: ${oldName} → ${next.name} (Core ${core.id})`);
          }
        } else {
          cur.cpuTime += SCHED_SLICE;
          cur.vrt += vrDelta(cur.priority);
          core.sliceUsed += SCHED_SLICE;
          core.proc = cur;

          let preempt = core.sliceUsed >= SCHED_SLICE;

          if (mode === "priority") {
            const curP = priNum(cur.priority);
            const higherReady = procs.some(
              (p) =>
                p.state === "READY" &&
                priNum(p.priority) > curP &&
                !cores.some((c) => c.proc?.id === p.id),
            );
            if (higherReady) preempt = true;
          }

          if (preempt) {
            const oldName = cur.name;
            cur.state = "READY";
            core.proc = null;
            core.sliceUsed = 0;
            const next = pickNextOSProc(procs, cores, mode, core.id, s.rrPtr);
            if (next) {
              next.state = "RUNNING";
              core.proc = next;
              pushLog(`[${s.t}ms] Context switch: ${oldName} → ${next.name} (Core ${core.id})`);
            } else {
              cur.state = "RUNNING";
              core.proc = cur;
            }
          }
        }
      } else {
        const next = pickNextOSProc(procs, cores, mode, core.id, s.rrPtr);
        if (next) {
          next.state = "RUNNING";
          core.proc = next;
          core.sliceUsed = 0;
          pushLog(`[${s.t}ms] ${next.name} → Core ${core.id} (scheduled)`);
        }
      }
    }

    s.procs = procs;
    s.cores = cores;
    syncSnap();
  }, [syncSnap]);

  const startSched = useCallback(() => {
    if (timerRef.current || simRef.current.procs.length === 0) return;
    setIsRunning(true);
    timerRef.current = setInterval(doTick, SCHED_TICK_MS);
  }, [doTick]);

  const pauseSched = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const resetSched = useCallback(() => {
    pauseSched();
    simRef.current = {
      t: 0,
      procs: [],
      cores: [makeOSCore(0), makeOSCore(1)],
      log: [],
      nextPid: 1001,
      rrPtr: { v: 0 },
    };
    syncSnap();
  }, [pauseSched, syncSnap]);

  const changeScheduler = useCallback((mode: SchedMode) => {
    schedRef.current = mode;
    setScheduler(mode);
  }, []);

  const addOSProcess = useCallback(
    (name: string, priority: ProcPriority) => {
      if (!name.trim()) return;
      const s = simRef.current;
      s.procs.push({
        id: s.nextPid,
        pid: s.nextPid,
        name: name.trim(),
        priority,
        state: "READY",
        cpuTime: 0,
        vrt: 0,
        waitLeft: 0,
      });
      s.nextPid++;
      syncSnap();
    },
    [syncSnap],
  );

  const loadBitcoinPreset = useCallback(() => {
    pauseSched();
    simRef.current = {
      t: 0,
      procs: [],
      cores: [makeOSCore(0), makeOSCore(1)],
      log: [],
      nextPid: 1001,
      rrPtr: { v: 0 },
    };
    const s = simRef.current;
    const presets: Array<[string, ProcPriority]> = [
      ["bitcoin-core", "HIGH"],
      ["mempool-checker", "NORMAL"],
      ["peer-connector", "NORMAL"],
      ["block-validator", "HIGH"],
      ["rpc-server", "LOW"],
    ];
    for (const [name, priority] of presets) {
      s.procs.push({
        id: s.nextPid,
        pid: s.nextPid,
        name,
        priority,
        state: "READY",
        cpuTime: 0,
        vrt: 0,
        waitLeft: 0,
      });
      s.nextPid++;
    }
    syncSnap();
  }, [pauseSched, syncSnap]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [snap.log.length]);

  const PCOL: Record<ProcPriority, string> = {
    HIGH: "#00d4ff",
    NORMAL: "#818cf8",
    LOW: "#f59e0b",
  };
  const SCOL: Record<ProcState, string> = {
    RUNNING: "#10b981",
    READY: "#f59e0b",
    WAITING: "#6b7280",
    SLEEPING: "#4b5563",
  };

  const maxCpu = Math.max(1, ...snap.procs.map((p) => p.cpuTime));

  return (
    <div className="widget-wrap" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="widget-head">
        <span className="widget-title">{"// watch the scheduler share the CPU"}</span>
        <div className="widget-controls">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--fg-mute)" }}>
            sim: {snap.t}ms
          </span>
        </div>
      </div>

      {/* CPU Cores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {snap.cores.map((core) => {
          const proc = core.proc;
          const pct = Math.min(100, (core.sliceUsed / SCHED_SLICE) * 100);
          const color = proc ? PCOL[proc.priority] : "var(--fg-mute)";
          return (
            <div
              key={core.id}
              style={{
                padding: "0.875rem",
                background: "var(--bg-2)",
                borderRadius: "0.5rem",
                border: `1px solid ${proc ? color + "44" : "var(--line)"}`,
                minHeight: "88px",
                transition: "border-color 0.3s",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.62rem",
                  color: "var(--fg-mute)",
                  marginBottom: "0.4rem",
                  letterSpacing: "0.1em",
                }}
              >
                CORE {core.id}
              </div>
              {proc ? (
                <>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color,
                      marginBottom: "0.15rem",
                    }}
                  >
                    {proc.name}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#10b981", marginBottom: "0.4rem" }}>
                    RUNNING · PID {proc.pid}
                  </div>
                  <div
                    style={{
                      height: "4px",
                      background: "var(--bg-0)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: color,
                        transition: `width ${SCHED_TICK_MS * 0.85}ms linear`,
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <div
                    style={{ fontSize: "0.62rem", color: "var(--fg-mute)", marginTop: "0.25rem" }}
                  >
                    {core.sliceUsed}ms / {SCHED_SLICE}ms slice
                  </div>
                </>
              ) : (
                <div
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--fg-mute)" }}
                >
                  idle
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scheduler selector */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--fg-mute)" }}
        >
          algorithm:
        </span>
        {(
          [
            ["rr", "Round Robin"],
            ["priority", "Priority"],
            ["cfs", "CFS"],
          ] as [SchedMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`widget-btn ${scheduler === mode ? "is-active" : ""}`}
            onClick={() => changeScheduler(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add Process */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={newName}
          placeholder="process name"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addOSProcess(newName, newPri);
              setNewName("");
            }
          }}
          style={{
            flex: "1 1 120px",
            padding: "0.375rem 0.625rem",
            background: "var(--bg-2)",
            border: "1px solid var(--line-strong)",
            borderRadius: "0.25rem",
            color: "var(--fg)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            outline: "none",
          }}
        />
        {(["LOW", "NORMAL", "HIGH"] as ProcPriority[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`widget-btn ${newPri === p ? "is-active" : ""}`}
            style={newPri === p ? { borderColor: PCOL[p], color: PCOL[p] } : {}}
            onClick={() => setNewPri(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="widget-btn"
          onClick={() => {
            if (newName.trim()) {
              addOSProcess(newName, newPri);
              setNewName("");
            }
          }}
        >
          + Add Process
        </button>
        <button
          type="button"
          className="widget-btn"
          onClick={loadBitcoinPreset}
          title="Load Bitcoin Node simulation"
        >
          ₿ Bitcoin preset
        </button>
      </div>

      {/* Process list */}
      {snap.procs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {snap.procs.map((proc) => (
            <div
              key={proc.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: "0.5rem",
                alignItems: "center",
                padding: "0.5rem 0.75rem",
                background: "var(--bg-2)",
                borderRadius: "0.375rem",
                borderLeft: `3px solid ${PCOL[proc.priority]}`,
                opacity: proc.state === "WAITING" || proc.state === "SLEEPING" ? 0.5 : 1,
                transition: "opacity 0.3s ease, border-color 0.3s ease",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--fg)",
                    }}
                  >
                    {proc.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      color: "var(--fg-mute)",
                    }}
                  >
                    PID {proc.pid}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "3px",
                      background: "var(--bg-0)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(proc.cpuTime / maxCpu) * 100}%`,
                        background: PCOL[proc.priority],
                        transition: "width 0.35s ease",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.62rem",
                      color: "var(--fg-mute)",
                    }}
                  >
                    {proc.cpuTime}ms CPU
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.62rem",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "0.2rem",
                  background: `${PCOL[proc.priority]}20`,
                  color: PCOL[proc.priority],
                  whiteSpace: "nowrap",
                }}
              >
                {proc.priority}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.62rem",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "0.2rem",
                  background: `${SCOL[proc.state]}20`,
                  color: SCOL[proc.state],
                  whiteSpace: "nowrap",
                }}
              >
                {proc.state}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          className="widget-btn"
          onClick={isRunning ? pauseSched : startSched}
          disabled={snap.procs.length === 0}
        >
          {isRunning ? "⏸ Pause" : "▶ Start"}
        </button>
        <button type="button" className="widget-btn" onClick={resetSched}>
          ⟳ Reset
        </button>
      </div>

      {/* Context switch log */}
      {snap.log.length > 0 && (
        <div
          ref={logBoxRef}
          style={{
            background: "var(--bg-2)",
            borderRadius: "0.375rem",
            padding: "0.75rem",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              color: "var(--fg-mute)",
              marginBottom: "0.4rem",
              letterSpacing: "0.06em",
            }}
          >
            context switch log
          </div>
          {snap.log.map((entry, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                color: i === snap.log.length - 1 ? "var(--neon-cyan)" : "var(--fg-mute)",
                lineHeight: "1.6",
              }}
            >
              {entry.text}
            </div>
          ))}
        </div>
      )}

      <p className="widget-caption">
        add processes or load the bitcoin preset, choose a scheduler, then press start. round robin
        gives equal time slices. priority starves low-priority processes when high-priority ones
        exist. cfs tracks virtual runtime and naturally balances cpu time weighted by priority.
      </p>
    </div>
  );
}

/* =====================================================================
   16. Sorting Race Widget
   ===================================================================== */

type SortStep =
  | { type: "compare"; i: number; j: number }
  | { type: "swap"; i: number; j: number }
  | { type: "set"; i: number; val: number }
  | { type: "done" };

function genBubbleSteps(input: number[]): { steps: SortStep[]; comparisons: number; swaps: number } {
  const a = [...input];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({ type: "compare", i: j, j: j + 1 });
      comparisons++;
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push({ type: "swap", i: j, j: j + 1 });
        swaps++;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  steps.push({ type: "done" });
  return { steps, comparisons, swaps };
}

function genInsertionSteps(input: number[]): { steps: SortStep[]; comparisons: number; swaps: number } {
  const a = [...input];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0) {
      steps.push({ type: "compare", i: j - 1, j });
      comparisons++;
      if (a[j - 1] > a[j]) {
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        steps.push({ type: "swap", i: j - 1, j });
        swaps++;
        j--;
      } else {
        break;
      }
    }
  }
  steps.push({ type: "done" });
  return { steps, comparisons, swaps };
}

function genMergeSteps(input: number[]): { steps: SortStep[]; comparisons: number; swaps: number } {
  const a = [...input];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  function ms(lo: number, hi: number) {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    ms(lo, mid);
    ms(mid, hi);
    const L = a.slice(lo, mid);
    const R = a.slice(mid, hi);
    let i = 0, j = 0, k = lo;
    while (i < L.length && j < R.length) {
      steps.push({ type: "compare", i: lo + i, j: mid + j });
      comparisons++;
      if (L[i] <= R[j]) {
        a[k] = L[i]; steps.push({ type: "set", i: k, val: L[i] }); swaps++; i++;
      } else {
        a[k] = R[j]; steps.push({ type: "set", i: k, val: R[j] }); swaps++; j++;
      }
      k++;
    }
    while (i < L.length) { a[k] = L[i]; steps.push({ type: "set", i: k, val: L[i] }); swaps++; i++; k++; }
    while (j < R.length) { a[k] = R[j]; steps.push({ type: "set", i: k, val: R[j] }); swaps++; j++; k++; }
  }

  ms(0, a.length);
  steps.push({ type: "done" });
  return { steps, comparisons, swaps };
}

function genQuickSteps(input: number[]): { steps: SortStep[]; comparisons: number; swaps: number } {
  const a = [...input];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  function partition(lo: number, hi: number): number {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      steps.push({ type: "compare", i: j, j: hi });
      comparisons++;
      if (a[j] <= pivot) {
        if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; steps.push({ type: "swap", i, j }); swaps++; }
        i++;
      }
    }
    if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; steps.push({ type: "swap", i, j: hi }); swaps++; }
    return i;
  }

  function qs(lo: number, hi: number) {
    if (lo >= hi) return;
    const p = partition(lo, hi);
    qs(lo, p - 1);
    qs(p + 1, hi);
  }

  qs(0, a.length - 1);
  steps.push({ type: "done" });
  return { steps, comparisons, swaps };
}

type ArrayInputType = "random" | "nearly" | "reversed" | "few-unique";

function makeArray(n: number, type: ArrayInputType): number[] {
  switch (type) {
    case "random": return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * n));
    case "nearly": {
      const a = Array.from({ length: n }, (_, i) => i + 1);
      for (let k = 0; k < Math.max(1, Math.floor(n * 0.05)); k++) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    case "reversed": return Array.from({ length: n }, (_, i) => n - i);
    case "few-unique": return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 5));
  }
}

type AlgoId = "bubble" | "insertion" | "merge" | "quick";

interface AlgoConfig {
  id: AlgoId;
  label: string;
  color: string;
}

const ALGO_CONFIGS: AlgoConfig[] = [
  { id: "bubble", label: "Bubble Sort", color: "#ff3b5c" },
  { id: "insertion", label: "Insertion Sort", color: "#818cf8" },
  { id: "merge", label: "Merge Sort", color: "#00d4ff" },
  { id: "quick", label: "Quick Sort", color: "#10b981" },
];

interface AlgoRow {
  id: AlgoId;
  arr: number[];
  steps: SortStep[];
  stepIdx: number;
  comparisons: number;
  totalComparisons: number;
  swaps: number;
  totalSwaps: number;
  done: boolean;
  highlight: [number, number] | null;
  swapping: [number, number] | null;
  startMs: number;
  endMs: number;
}

const STEPS_PER_FRAME_MAP = [1, 2, 4, 8, 16, 32];

function SortingRaceWidget() {
  const [n, setN] = useState(40);
  const [inputType, setInputType] = useState<ArrayInputType>("random");
  const [enabled, setEnabled] = useState<Record<AlgoId, boolean>>({
    bubble: true, insertion: false, merge: true, quick: true,
  });
  const [speedIdx, setSpeedIdx] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const rowsRef = useRef<AlgoRow[]>([]);
  const [displayRows, setDisplayRows] = useState<AlgoRow[]>([]);
  const rafRef = useRef<number | null>(null);
  const baseArrRef = useRef<number[]>(makeArray(40, "random"));

  const buildRows = useCallback((arr: number[]) => {
    const rows: AlgoRow[] = [];
    for (const cfg of ALGO_CONFIGS) {
      if (!enabled[cfg.id]) continue;
      const gen =
        cfg.id === "bubble" ? genBubbleSteps :
        cfg.id === "insertion" ? genInsertionSteps :
        cfg.id === "merge" ? genMergeSteps :
        genQuickSteps;
      const { steps, comparisons, swaps } = gen(arr);
      rows.push({
        id: cfg.id, arr: [...arr], steps, stepIdx: 0,
        comparisons: 0, totalComparisons: comparisons,
        swaps: 0, totalSwaps: swaps,
        done: false, highlight: null, swapping: null,
        startMs: 0, endMs: 0,
      });
    }
    return rows;
  }, [enabled]);

  const syncDisplay = useCallback(() => {
    setDisplayRows(rowsRef.current.map(r => ({ ...r, arr: [...r.arr] })));
  }, []);

  const generate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsRunning(false);
    setIsDone(false);
    const arr = makeArray(n, inputType);
    baseArrRef.current = arr;
    rowsRef.current = buildRows(arr);
    syncDisplay();
  }, [n, inputType, buildRows, syncDisplay]);

  useEffect(() => { generate(); }, []);

  const applyStep = (row: AlgoRow, step: SortStep): void => {
    row.highlight = null;
    row.swapping = null;
    if (step.type === "compare") {
      row.highlight = [step.i, step.j];
      row.comparisons++;
    } else if (step.type === "swap") {
      [row.arr[step.i], row.arr[step.j]] = [row.arr[step.j], row.arr[step.i]];
      row.swapping = [step.i, step.j];
      row.swaps++;
    } else if (step.type === "set") {
      row.arr[step.i] = step.val;
    } else if (step.type === "done") {
      row.done = true;
      row.highlight = null;
      row.endMs = performance.now();
    }
  };

  const tick = useCallback(() => {
    const rows = rowsRef.current;
    const stepsPerFrame = STEPS_PER_FRAME_MAP[speedIdx] ?? 4;
    let anyRunning = false;

    for (const row of rows) {
      if (row.done) continue;
      anyRunning = true;
      for (let s = 0; s < stepsPerFrame && row.stepIdx < row.steps.length; s++) {
        applyStep(row, row.steps[row.stepIdx]);
        row.stepIdx++;
        if (row.done) break;
      }
    }

    syncDisplay();

    if (!anyRunning) {
      setIsRunning(false);
      setIsDone(true);
      rafRef.current = null;
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [speedIdx, syncDisplay]);

  const start = useCallback(() => {
    if (isRunning) return;
    const now = performance.now();
    for (const row of rowsRef.current) {
      if (!row.done) row.startMs = now;
    }
    setIsRunning(true);
    setIsDone(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, tick]);

  const pause = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    rowsRef.current = buildRows(baseArrRef.current);
    setIsRunning(false);
    setIsDone(false);
    syncDisplay();
  }, [buildRows, syncDisplay]);

  const loadPreset = useCallback((type: ArrayInputType) => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setInputType(type);
    setIsRunning(false);
    setIsDone(false);
    const arr = makeArray(n, type);
    baseArrRef.current = arr;
    rowsRef.current = buildRows(arr);
    syncDisplay();
  }, [n, buildRows, syncDisplay]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const maxVal = n;

  return (
    <div className="widget-wrap" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="widget-head">
        <span className="widget-title">{"// race the algorithms"}</span>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)" }}>
            n = {n}
          </span>
          <input
            type="range" min={10} max={120} step={5} value={n}
            onChange={e => { setN(Number(e.target.value)); }}
            style={{ width: "120px" }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)" }}>input</span>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {(["random", "nearly", "reversed", "few-unique"] as ArrayInputType[]).map(t => {
              const labels: Record<ArrayInputType, string> = { random: "Random", nearly: "Nearly Sorted", reversed: "Reversed", "few-unique": "Few Unique" };
              return (
                <button key={t} type="button" className={`widget-btn ${inputType === t ? "is-active" : ""}`} onClick={() => setInputType(t)} style={{ fontSize: "0.7rem" }}>
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)" }}>algorithms</span>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {ALGO_CONFIGS.map(cfg => (
              <button
                key={cfg.id}
                type="button"
                className={`widget-btn ${enabled[cfg.id] ? "is-active" : ""}`}
                style={enabled[cfg.id] ? { borderColor: cfg.color, color: cfg.color } : { fontSize: "0.7rem" }}
                onClick={() => setEnabled(e => ({ ...e, [cfg.id]: !e[cfg.id] }))}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)" }}>speed</span>
          <input type="range" min={0} max={5} step={1} value={speedIdx} onChange={e => setSpeedIdx(Number(e.target.value))} style={{ width: "80px" }} />
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="widget-btn" onClick={generate}>Generate</button>
        <button type="button" className="widget-btn" onClick={isRunning ? pause : start} disabled={displayRows.length === 0}>
          {isRunning ? "Pause" : "Sort All"}
        </button>
        <button type="button" className="widget-btn" onClick={reset}>Reset</button>
        <button type="button" className="widget-btn" style={{ fontSize: "0.7rem" }} onClick={() => loadPreset("nearly")}>
          Nearly Sorted (bubble wins)
        </button>
        <button type="button" className="widget-btn" style={{ fontSize: "0.7rem" }} onClick={() => loadPreset("reversed")}>
          Reversed (bubble worst case)
        </button>
      </div>

      {/* Algorithm rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {displayRows.map(row => {
          const cfg = ALGO_CONFIGS.find(c => c.id === row.id)!;
          const elapsedMs = row.done
            ? ((row.endMs - row.startMs) / 1000).toFixed(3)
            : null;
          return (
            <div key={row.id} style={{ background: "var(--bg-2)", borderRadius: "0.5rem", padding: "0.75rem", borderLeft: `3px solid ${cfg.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.25rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: cfg.color }}>
                  {cfg.label}
                </span>
                <div style={{ display: "flex", gap: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)" }}>
                  <span>cmp: {row.comparisons}</span>
                  <span>swaps: {row.swaps}</span>
                  {elapsedMs && <span style={{ color: "#10b981" }}>{elapsedMs}s</span>}
                  {row.done && <span style={{ color: "#10b981" }}>DONE</span>}
                  {!row.done && isRunning && <span style={{ color: cfg.color }}>SORTING...</span>}
                </div>
              </div>

              {/* Bar chart */}
              <div style={{ display: "flex", alignItems: "flex-end", height: "60px", gap: "1px", overflow: "hidden" }}>
                {row.arr.map((val, idx) => {
                  const isHighlight = row.highlight && (idx === row.highlight[0] || idx === row.highlight[1]);
                  const isSwapping = row.swapping && (idx === row.swapping[0] || idx === row.swapping[1]);
                  let color = `${cfg.color}80`;
                  if (isSwapping) color = "#f59e0b";
                  else if (isHighlight) color = cfg.color;
                  else if (row.done) color = `${cfg.color}50`;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${Math.max(2, (val / maxVal) * 58)}px`,
                        background: color,
                        borderRadius: "1px 1px 0 0",
                        transition: isSwapping ? "none" : "height 0.05s, background 0.1s",
                        minWidth: "1px",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {displayRows.length === 0 && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--fg-mute)", padding: "1rem", textAlign: "center" }}>
            select at least one algorithm above
          </div>
        )}
      </div>

      {/* Results table */}
      {isDone && displayRows.length > 0 && (
        <div style={{ background: "var(--bg-2)", borderRadius: "0.5rem", overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-mute)", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--line)" }}>
            results
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Algorithm", "Comparisons", "Swaps/Writes", "Time"].map(h => (
                    <th key={h} style={{ padding: "0.4rem 0.75rem", textAlign: "left", color: "var(--fg-mute)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...displayRows].sort((a, b) => a.comparisons - b.comparisons).map(row => {
                  const cfg = ALGO_CONFIGS.find(c => c.id === row.id)!;
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.4rem 0.75rem", color: cfg.color, fontWeight: 700 }}>{cfg.label}</td>
                      <td style={{ padding: "0.4rem 0.75rem", color: "var(--fg)" }}>{row.comparisons.toLocaleString()}</td>
                      <td style={{ padding: "0.4rem 0.75rem", color: "var(--fg)" }}>{row.swaps.toLocaleString()}</td>
                      <td style={{ padding: "0.4rem 0.75rem", color: "#10b981" }}>
                        {((row.endMs - row.startMs) / 1000).toFixed(3)}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="widget-caption">
        generate an array, select algorithms, then sort. on nearly-sorted input bubble sort exits early and beats merge sort — a reminder that O(n log n) is not always faster than O(n squared) in practice.
      </p>
    </div>
  );
}

/* =====================================================================
   Public dispatcher
   ===================================================================== */
export function DistributedWidget({ name }: { name: WidgetName }) {
  switch (name) {
    case "gossip-network":
      return <GossipNetworkWidget />;
    case "cap-triangle":
      return <CapTriangleWidget />;
    case "network-partition":
      return <NetworkPartitionWidget />;
    case "bit-toggle":
      return <BitToggleWidget />;
    case "char-explorer":
      return <CharExplorerWidget />;
    case "text-encoder":
      return <TextEncoderWidget />;
    case "gate-simulator":
      return <GateSimulatorWidget />;
    case "cap-visualiser":
      return <CapVisualiserWidget />;
    case "fetch-decode-execute":
      return <FetchDecodeExecuteWidget />;
    case "pacelc-simulator":
      return <PacelcSimulatorWidget />;
    case "blockchain-simulator":
      return <BlockchainSimulatorWidget />;
    case "call-stack-visualiser":
      return <CallStackVisualiserWidget />;
    case "memory-explorer":
      return <MemoryExplorerWidget />;
    case "big-o-race":
      return <BigORaceWidget />;
    case "process-scheduler":
      return <ProcessSchedulerWidget />;
    case "sorting-race":
      return <SortingRaceWidget />;
    default:
      return null;
  }
}
