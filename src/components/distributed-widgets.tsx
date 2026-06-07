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
        <span className="widget-title">{"// the bit toggle - click any bit"}</span>
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
        <span className="widget-title">{"// character explorer - type any letter"}</span>
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
const TEXT_PRESETS = ["Hello", "ScrapyBytes", "ASCII", "Hi"];

function TextEncoderWidget() {
  const [text, setText] = useState<string>("Hello");

  const chars = text.split("").slice(0, 8);
  const totalBytes = chars.length;
  const totalBits = totalBytes * 8;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// text encoder - every character becomes 8 bits"}</span>
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
        <span className="widget-title">{"// try it - wire your own gate"}</span>
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
        <span className="widget-title">{"// CAP visualiser - cut the network and choose a side"}</span>
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
        generate an array, select algorithms, then sort. on nearly-sorted input bubble sort exits early and beats merge sort - a reminder that O(n log n) is not always faster than O(n squared) in practice.
      </p>
    </div>
  );
}

/* =====================================================================
   Public dispatcher
   ===================================================================== */
/* =====================================================================
   17. Memory-layout visualiser: declare a variable, watch it land in the
   correct region of the process address space (variables page)
   ===================================================================== */
type MlvType = "i32" | "f64" | "bool" | "String" | "Vec<i32>" | "struct" | "static" | "const";
type MlvRegion = "stack" | "heap" | "bss" | "data" | "rodata" | "text";

interface MlvTypeMeta {
  rust: string;
  c: string;
  region: MlvRegion;
  size: number; // size of the stack/region slot in bytes
  heap: boolean; // true => header on stack + buffer on heap
  def: string; // default value
}

const MLV_TYPES: Record<MlvType, MlvTypeMeta> = {
  i32: { rust: "i32", c: "int", region: "stack", size: 4, heap: false, def: "42" },
  f64: { rust: "f64", c: "double", region: "stack", size: 8, heap: false, def: "3.14" },
  bool: { rust: "bool", c: "bool", region: "stack", size: 1, heap: false, def: "true" },
  String: { rust: "String", c: "char *", region: "stack", size: 24, heap: true, def: "hello" },
  "Vec<i32>": { rust: "Vec<i32>", c: "int *", region: "stack", size: 24, heap: true, def: "1, 2, 3" },
  struct: { rust: "Point", c: "Point", region: "stack", size: 16, heap: false, def: "3.14, 2.71" },
  static: { rust: "i32", c: "int", region: "data", size: 4, heap: false, def: "100" },
  const: { rust: "i32", c: "int", region: "rodata", size: 4, heap: false, def: "999" },
};

const MLV_PALETTE = ["var(--neon-cyan)", "var(--neon-rose)", "var(--neon-lime)", "var(--neon-violet)", "var(--neon-indigo)"];

const MLV_REGION_LABEL: Record<MlvRegion, string> = {
  stack: "STACK",
  heap: "HEAP",
  bss: "BSS  (zero globals)",
  data: "DATA  (init globals)",
  rodata: "RODATA  (constants)",
  text: "TEXT  (code)",
};

const MLV_LIFETIME: Record<MlvRegion, string> = {
  stack: "until function returns",
  heap: "until dropped / freed",
  data: "process lifetime",
  bss: "process lifetime",
  rodata: "process lifetime (read-only)",
  text: "process lifetime (read-only)",
};

interface MlvVar {
  id: number;
  name: string;
  type: MlvType;
  value: string;
  lang: "rust" | "c";
  color: string;
  region: MlvRegion;
  heap: boolean;
  size: number;
  stackAddr: string;
  heapAddr: string | null;
  heapBytes: number;
}

const hex16 = (n: number) => "0x" + n.toString(16).padStart(12, "0");

// MSB-first binary, grouped into bytes, for an integer value across `bytes` bytes
function mlvBin(value: number, bytes: number): string {
  const mask = BigInt.asUintN(bytes * 8, BigInt(Math.trunc(value)));
  const s = mask.toString(2).padStart(bytes * 8, "0");
  return s.match(/.{1,8}/g)!.join(" ");
}
function mlvHex(value: number, bytes: number): string {
  const mask = BigInt.asUintN(bytes * 8, BigInt(Math.trunc(value)));
  return "0x" + mask.toString(16).toUpperCase().padStart(bytes * 2, "0");
}
// IEEE-754 double, byte order as stored in little-endian RAM
function mlvF64(value: number): { bin: string; hex: string } {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, true);
  const arr = [...new Uint8Array(buf)];
  return {
    bin: arr.map((b) => b.toString(2).padStart(8, "0")).join(" "),
    hex: "0x" + arr.map((b) => b.toString(16).padStart(2, "0")).reverse().join("").toUpperCase(),
  };
}

function mlvDecl(v: MlvVar): string {
  const m = MLV_TYPES[v.type];
  const upper = v.name;
  if (v.lang === "rust") {
    switch (v.type) {
      case "String":
        return `let ${v.name} = String::from("${v.value}");`;
      case "Vec<i32>":
        return `let ${v.name} = vec![${v.value}];`;
      case "static":
        return `static ${upper}: i32 = ${v.value};`;
      case "const":
        return `const ${upper}: i32 = ${v.value};`;
      case "struct":
        return `let ${v.name} = Point { x: ${v.value.split(",")[0]?.trim() || "0.0"}, y: ${v.value.split(",")[1]?.trim() || "0.0"} };`;
      default:
        return `let ${v.name}: ${m.rust} = ${v.value};`;
    }
  }
  // C
  switch (v.type) {
    case "String":
      return `char *${v.name} = strdup("${v.value}");`;
    case "Vec<i32>":
      return `int *${v.name} = malloc(${v.value.split(",").length} * sizeof(int));`;
    case "static":
      return `static int ${v.name} = ${v.value};`;
    case "const":
      return `const int ${v.name} = ${v.value};`;
    case "struct":
      return `Point ${v.name} = { ${v.value} };`;
    default:
      return `${m.c} ${v.name} = ${v.value};`;
  }
}

function MemoryLayoutWidget() {
  const [lang, setLang] = useState<"rust" | "c">("rust");
  const [type, setType] = useState<MlvType>("i32");
  const [name, setName] = useState("x");
  const [value, setValue] = useState("42");
  const [vars, setVars] = useState<MlvVar[]>([]);
  const idRef = useRef(0);

  const pickType = (t: MlvType) => {
    setType(t);
    setValue(MLV_TYPES[t].def);
    if (t === "static" || t === "const") setName(name.toUpperCase() === name ? name : "X");
    else if (name === name.toUpperCase()) setName("x");
  };

  const declare = () => {
    if (vars.length >= 5) return;
    const m = MLV_TYPES[type];
    const idx = idRef.current++;
    const stackCount = vars.filter((v) => v.region === "stack").length;
    const heapCount = vars.filter((v) => v.heap).length;
    const dataCount = vars.filter((v) => v.region === "data").length;
    const rodataCount = vars.filter((v) => v.region === "rodata").length;

    let stackAddr = "";
    if (m.region === "stack") stackAddr = hex16(0x7ffe23a4f8d4 - stackCount * 16);
    else if (m.region === "data") stackAddr = hex16(0x55b6e9c1d100 + dataCount * 16);
    else if (m.region === "rodata") stackAddr = hex16(0x55b6e9c1d000 + rodataCount * 16);

    let heapBytes = 0;
    if (type === "String") heapBytes = value.length;
    if (type === "Vec<i32>") heapBytes = value.split(",").filter((s) => s.trim() !== "").length * 4;

    const v: MlvVar = {
      id: idx,
      name: name || "x",
      type,
      value,
      lang,
      color: MLV_PALETTE[vars.length % MLV_PALETTE.length],
      region: m.region,
      heap: m.heap,
      size: m.size,
      stackAddr,
      heapAddr: m.heap ? hex16(0x55b6ea102b30 + heapCount * 0x40) : null,
      heapBytes,
    };
    setVars((cur) => [...cur, v]);
  };

  const clear = () => {
    setVars([]);
    idRef.current = 0;
  };

  const last = vars[vars.length - 1] ?? null;

  // details rows for the most recently declared variable
  const detailRows = (() => {
    if (!last) return null;
    const rows: Array<[string, string]> = [];
    rows.push(["Region", MLV_REGION_LABEL[last.region].split("  ")[0]]);
    rows.push(["Address", last.stackAddr]);
    if (last.heap && last.heapAddr) {
      rows.push(["Buffer", `${last.heapAddr}  (HEAP)`]);
      rows.push(["Size", `${last.size} byte header + ${last.heapBytes} byte buffer`]);
    } else {
      rows.push(["Size", `${last.size} bytes`]);
    }
    const num = parseFloat(last.value);
    if (last.type === "i32" || last.type === "static" || last.type === "const") {
      rows.push(["Binary", mlvBin(num || 0, 4)]);
      rows.push(["Hex", mlvHex(num || 0, 4)]);
    } else if (last.type === "bool") {
      const b = /^(true|1)$/i.test(last.value.trim()) ? 1 : 0;
      rows.push(["Binary", mlvBin(b, 1)]);
      rows.push(["Hex", mlvHex(b, 1)]);
    } else if (last.type === "f64") {
      const f = mlvF64(num || 0);
      rows.push(["Binary", f.bin]);
      rows.push(["Hex", f.hex]);
    } else if (last.type === "struct") {
      rows.push(["Layout", "2 x f64, contiguous, 8-byte aligned"]);
    } else if (last.heap) {
      rows.push(["Header", "ptr (8) + len (8) + cap (8) = 24 bytes"]);
    }
    rows.push(["Lifetime", MLV_LIFETIME[last.region]]);
    return rows;
  })();

  // one rendered block per variable, for a given region
  const blockFor = (v: MlvVar, slot: "stack" | "heap") => {
    const isHeader = v.heap && slot === "stack";
    const isBuffer = v.heap && slot === "heap";
    return (
      <div key={`${v.id}-${slot}`} className="mlv-var" style={{ borderLeftColor: v.color }}>
        <div className="mlv-var-top">
          <span className="mlv-var-name" style={{ color: v.color }}>
            {v.name}
            {isHeader ? " (header)" : isBuffer ? " (buffer)" : ""}
          </span>
          <span className="mlv-var-type">{lang === "rust" ? MLV_TYPES[v.type].rust : MLV_TYPES[v.type].c}</span>
        </div>
        <div className="mlv-var-meta">
          {isBuffer ? (
            <>
              <span className="mlv-var-addr">{v.heapAddr}</span>
              <span className="mlv-var-size">{v.heapBytes} bytes</span>
            </>
          ) : (
            <>
              <span className="mlv-var-addr">{v.stackAddr}</span>
              <span className="mlv-var-size">{isHeader ? "24 B hdr" : `${v.size} bytes`}</span>
            </>
          )}
        </div>
        {isHeader && <span className="mlv-var-link">→ buffer @ {v.heapAddr}</span>}
        {isBuffer && <span className="mlv-var-link">↑ header @ {v.stackAddr}</span>}
        {!v.heap && <span className="mlv-var-val">= {v.value}</span>}
      </div>
    );
  };

  const lane = (region: MlvRegion, note?: string) => {
    const isHeapLane = region === "heap";
    const slot: "stack" | "heap" = isHeapLane ? "heap" : "stack";
    const items = isHeapLane ? vars.filter((v) => v.heap) : vars.filter((v) => v.region === region);
    return (
      <div className={`mlv-lane mlv-lane-${region}`}>
        <div className="mlv-lane-label">{MLV_REGION_LABEL[region]}</div>
        <div className="mlv-lane-body">
          {items.map((v) => blockFor(v, slot))}
          {items.length === 0 && note && <span className="mlv-lane-note">{note}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// declare a variable. watch it land."}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${lang === "rust" ? "is-active" : ""}`} onClick={() => setLang("rust")}>
            Rust
          </button>
          <button type="button" className={`widget-btn ${lang === "c" ? "is-active" : ""}`} onClick={() => setLang("c")}>
            C
          </button>
        </div>
      </div>

      <div className="mlv">
        {/* LEFT: declaration controls */}
        <div className="mlv-declare">
          <div className="mlv-col-title">declare</div>

          <div className="mlv-type-tabs">
            {(Object.keys(MLV_TYPES) as MlvType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`widget-btn ${type === t ? "is-active" : ""}`}
                onClick={() => pickType(t)}
              >
                {lang === "rust" ? t : MLV_TYPES[t].c.trim() === "char *" ? "char*" : t === "Vec<i32>" ? "int*" : MLV_TYPES[t].c}
              </button>
            ))}
          </div>

          <div className="mlv-inputs">
            <label className="cs-field">
              name
              <input value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, "") || "")} maxLength={12} />
            </label>
            <label className="cs-field">
              value ({lang === "rust" ? MLV_TYPES[type].rust : MLV_TYPES[type].c})
              <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={24} />
            </label>
          </div>

          <pre className="mlv-decl-preview">
            <code>{mlvDecl({ ...({} as MlvVar), name: name || "x", type, value, lang })}</code>
          </pre>

          <div className="mlv-actions">
            <button type="button" className="widget-btn mlv-declare-btn" onClick={declare} disabled={vars.length >= 5}>
              {vars.length >= 5 ? "max 5 declared" : "declare →"}
            </button>
            <button type="button" className="widget-btn" onClick={clear}>
              clear
            </button>
          </div>

          {detailRows && (
            <div className="mlv-details">
              <div className="mlv-col-title">last declared: {last!.name}</div>
              {detailRows.map(([k, val]) => (
                <div key={k} className="mlv-detail-row">
                  <span className="mlv-detail-key">{k}</span>
                  <span className="mlv-detail-val">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: process memory map */}
        <div className="mlv-map">
          <div className="mlv-edge mlv-edge-high">high addresses</div>
          {lane("stack", "↓ stack grows downward")}
          <div className="mlv-free">free address space</div>
          {lane("heap", "↑ heap grows upward")}
          {lane("bss", "zero-initialised globals")}
          {lane("data", "static / initialised globals")}
          {lane("rodata", "const / string literals")}
          {lane("text", "your compiled instructions")}
          <div className="mlv-edge mlv-edge-low">low addresses</div>
        </div>
      </div>

      <p className="widget-caption">
        pick a type, name it, give it a value, then declare. scalars land on the STACK; <code>String</code> and <code>Vec</code> split into a stack header and a heap buffer; <code>static</code> lands in DATA, <code>const</code> in RODATA. declare up to five and watch them stack up in the right regions.
      </p>
    </div>
  );
}

/* =====================================================================
   18. Pointer visualiser: take an address, dereference, write through,
   create a dangling pointer, build a pointer chain (pointers page)
   ===================================================================== */
type PvMode = "basic" | "danger" | "chain";
type PvLang = "rust" | "c";
type PvTone = "ok" | "warn" | "bad";

interface PvRow {
  addr: string;
  kind: "data" | "pointer" | "empty" | "freed";
  name?: string;
  typeLabel?: string;
  value?: string;
  target?: number;
}

const PV_ROW_H = 50;
const PV_ROW_GAP = 8;
const PV_GUTTER = 30;

const pvBasicRows = (xVal: number): PvRow[] => [
  { addr: "0x1000", kind: "data", name: "x", typeLabel: "i32", value: String(xVal) },
  { addr: "0x1004", kind: "empty" },
  { addr: "0x1008", kind: "pointer", name: "p", typeLabel: "&x", value: "0x1000", target: 0 },
  { addr: "0x100C", kind: "empty" },
  { addr: "0x1010", kind: "data", name: "y", typeLabel: "i32", value: "99" },
  { addr: "0x1014", kind: "pointer", name: "q", typeLabel: "&y", value: "0x1010", target: 4 },
];

const pvChainRows = (): PvRow[] => [
  { addr: "0x1000", kind: "data", name: "x", typeLabel: "i32", value: "42" },
  { addr: "0x2000", kind: "pointer", name: "p", typeLabel: "&x", value: "0x1000", target: 0 },
  { addr: "0x3000", kind: "pointer", name: "pp", typeLabel: "&p", value: "0x2000", target: 1 },
];

const pvDangerRows = (freed: boolean): PvRow[] => [
  { addr: "0x1000", kind: freed ? "freed" : "data", name: "x", typeLabel: "i32", value: freed ? "????" : "42" },
  { addr: "0x1008", kind: "pointer", name: "p", typeLabel: "&x", value: "0x1000", target: 0 },
];

function pvCode(mode: PvMode, lang: PvLang, xVal: number): string {
  if (mode === "danger") {
    return lang === "rust"
      ? `let owned = Box::new(42);
let r = &*owned;
drop(owned);
// println!("{}", *r);
//   error[E0382]: borrow of
//   moved value \`owned\``
      : `int *p = malloc(sizeof(int));
*p = 42;
free(p);
printf("%d", *p);  // use-after-free: UB`;
  }
  if (mode === "chain") {
    return lang === "rust"
      ? `let x = 42;
let p = &x;      // p  -> x
let pp = &p;     // pp -> p -> x
// **pp == 42`
      : `int x = 42;
int *p = &x;     // p  -> x
int **pp = &p;   // pp -> p -> x
// **pp == 42`;
  }
  return lang === "rust"
    ? `let x: i32 = ${xVal};
let p: *const i32 = &x;
// p  = 0x1000
// *p = ${xVal}`
    : `int x = ${xVal};
int *p = &x;
// p  = 0x1000
// *p = ${xVal}`;
}

function PointerVisualiserWidget() {
  const [mode, setMode] = useState<PvMode>("basic");
  const [lang, setLang] = useState<PvLang>("rust");
  const [xVal, setXVal] = useState(42);
  const [arrows, setArrows] = useState<Array<{ from: number; to: number }>>([]);
  const [glow, setGlow] = useState<number[]>([]);
  const [freed, setFreed] = useState(false);
  const [derefDead, setDerefDead] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: PvTone }>({
    text: "click a pointer row, or run an operation below",
    tone: "ok",
  });

  const rows = mode === "chain" ? pvChainRows() : mode === "danger" ? pvDangerRows(freed) : pvBasicRows(xVal);

  const goBasic = () => {
    setMode("basic");
    setArrows([]);
    setGlow([]);
    setXVal(42);
    setFreed(false);
    setDerefDead(false);
    setMessage({ text: "click a pointer row, or run an operation below", tone: "ok" });
  };
  const goDanger = () => {
    setMode("danger");
    setFreed(false);
    setDerefDead(false);
    setArrows([{ from: 1, to: 0 }]);
    setGlow([]);
    setMessage({ text: "p points to x. valid, for now.", tone: "ok" });
  };
  const goChain = () => {
    setMode("chain");
    setArrows([
      { from: 2, to: 1 },
      { from: 1, to: 0 },
    ]);
    setGlow([]);
    setMessage({ text: "pp -> p -> x -> 42. a pointer to a pointer.", tone: "ok" });
  };

  const clickPointer = (i: number) => {
    const r = rows[i];
    if (r.kind !== "pointer" || r.target == null) return;
    const t = rows[r.target];
    setArrows([{ from: i, to: r.target }]);
    if (mode === "danger" && freed) {
      setDerefDead(true);
      setGlow([]);
      setMessage({ text: "use after free: p still reads 0x1000, but it is freed", tone: "bad" });
      return;
    }
    setGlow([r.target]);
    setMessage({ text: `${r.name} -> ${t.name} @ ${t.addr}   (*${r.name} = ${t.value})`, tone: "ok" });
  };

  const opAddr = () => {
    setArrows([{ from: 2, to: 0 }]);
    setGlow([]);
    setMessage({ text: "p = &x = 0x1000   (p now holds the address of x)", tone: "ok" });
  };
  const opDeref = () => {
    setArrows([{ from: 2, to: 0 }]);
    setGlow([0]);
    setMessage({ text: `*p = ${xVal}   (the value stored at 0x1000)`, tone: "ok" });
  };
  const opWrite = () => {
    setXVal(99);
    setArrows([{ from: 2, to: 0 }]);
    setGlow([0]);
    setMessage({ text: "*p = 99   wrote through the pointer. now x == *p == 99", tone: "warn" });
  };

  const freeX = () => {
    setFreed(true);
    setDerefDead(false);
    setGlow([]);
    setArrows([{ from: 1, to: 0 }]);
    setMessage({ text: "x dropped. p still holds 0x1000, now a dangling pointer.", tone: "warn" });
  };
  const derefDanger = () => {
    setArrows([{ from: 1, to: 0 }]);
    if (!freed) {
      setGlow([0]);
      setMessage({ text: "*p = 42. a valid read, while x is still alive.", tone: "ok" });
    } else {
      setDerefDead(true);
      setGlow([]);
      setMessage({ text: "use after free: reading freed memory is undefined behaviour", tone: "bad" });
    }
  };

  const PvArrow = ({ from, to }: { from: number; to: number }) => {
    const ya = from * (PV_ROW_H + PV_ROW_GAP) + PV_ROW_H / 2;
    const yb = to * (PV_ROW_H + PV_ROW_GAP) + PV_ROW_H / 2;
    const dead = derefDead;
    const col = dead ? "var(--neon-rose)" : "var(--neon-indigo)";
    return (
      <g>
        <path
          d={`M ${PV_GUTTER - 2},${ya} C 3,${ya} 3,${yb} ${PV_GUTTER - 2},${yb}`}
          fill="none"
          stroke={col}
          strokeWidth="1.6"
          strokeDasharray={dead ? "4 3" : undefined}
        />
        <polygon points={`${PV_GUTTER - 2},${yb} ${PV_GUTTER - 9},${yb - 4} ${PV_GUTTER - 9},${yb + 4}`} fill={col} />
        <circle cx={PV_GUTTER - 2} cy={ya} r="2.5" fill={col} />
      </g>
    );
  };

  const svgH = rows.length * (PV_ROW_H + PV_ROW_GAP);

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// follow the pointer"}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${mode === "basic" ? "is-active" : ""}`} onClick={goBasic}>
            basic
          </button>
          <button type="button" className={`widget-btn ${mode === "chain" ? "is-active" : ""}`} onClick={goChain}>
            pointer chain
          </button>
          <button type="button" className={`widget-btn pv-skull ${mode === "danger" ? "is-active" : ""}`} onClick={goDanger}>
            &#9760; dangling
          </button>
        </div>
      </div>

      <div className="pv">
        {/* LEFT: memory */}
        <div className="pv-mem">
          <div className="pv-col-title">variables in memory</div>
          <div className="pv-mem-body">
            <svg className="pv-gutter" width={PV_GUTTER} height={svgH} viewBox={`0 0 ${PV_GUTTER} ${svgH}`} aria-hidden="true">
              {arrows.map((a, i) => (
                <PvArrow key={i} from={a.from} to={a.to} />
              ))}
            </svg>
            <div className="pv-rows">
              {rows.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pv-cell pv-${r.kind} ${glow.includes(i) ? "is-glow" : ""} ${r.kind === "pointer" ? "is-clickable" : ""}`}
                  onClick={() => clickPointer(i)}
                  disabled={r.kind !== "pointer"}
                >
                  <span className="pv-addr">{r.addr}</span>
                  <span className="pv-val">
                    {r.kind === "empty" ? "·" : r.kind === "freed" ? "FREED" : r.value}
                  </span>
                  <span className="pv-name">
                    {r.kind === "freed"
                      ? "use-after-free → UB"
                      : r.name
                        ? `${r.name}${r.typeLabel ? `  (${r.typeLabel})` : ""}`
                        : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE: operation */}
        <div className="pv-ops">
          <div className="pv-col-title">operation</div>

          {mode === "basic" && (
            <div className="pv-op-btns">
              <button type="button" className="widget-btn" onClick={opAddr}>
                &amp; addr
              </button>
              <button type="button" className="widget-btn" onClick={opDeref}>
                *p read
              </button>
              <button type="button" className="widget-btn" onClick={opWrite}>
                *p = 99
              </button>
            </div>
          )}

          {mode === "danger" && (
            <div className="pv-op-btns">
              <button type="button" className="widget-btn" onClick={freeX} disabled={freed}>
                drop / free x
              </button>
              <button type="button" className="widget-btn" onClick={derefDanger}>
                dereference p
              </button>
            </div>
          )}

          {mode === "chain" && <p className="pv-chain-note">pp holds the address of p, which holds the address of x. three cells, two hops, one value at the end.</p>}

          <div className={`pv-readout tone-${message.tone}`}>{message.text}</div>

          {mode === "danger" && derefDead && (
            <div className="pv-danger-detail">
              <div className="pv-danger-line c">C: silently returns garbage from freed memory</div>
              <div className="pv-danger-line rust">Rust: compile error, borrow outlives owner</div>
            </div>
          )}
        </div>

        {/* RIGHT: code */}
        <div className="pv-code">
          <div className="pv-code-head">
            <span className="pv-col-title">code</span>
            <div className="pv-lang-tabs">
              <button type="button" className={`widget-btn ${lang === "rust" ? "is-active" : ""}`} onClick={() => setLang("rust")}>
                Rust
              </button>
              <button type="button" className={`widget-btn ${lang === "c" ? "is-active" : ""}`} onClick={() => setLang("c")}>
                C
              </button>
            </div>
          </div>
          <pre className="pv-code-pre">
            <code>{pvCode(mode, lang, xVal)}</code>
          </pre>
        </div>
      </div>

      <p className="widget-caption">
        in basic mode, take an address, read through the pointer, or write through it and watch x change. the dangling mode drops x and shows what a use-after-free is in C versus Rust. the chain mode builds a pointer to a pointer.
      </p>
    </div>
  );
}

/* =====================================================================
   19. Phase classifier: a 10-question quiz, compile time vs runtime
   (compile-vs-runtime page)
   ===================================================================== */
type PcPhase = "compile" | "runtime";
type PcLang = "rust" | "c";

interface PcScenario {
  title: string;
  desc: string;
  rust: string;
  c: string;
  answer: PcPhase;
  answerLabel: string;
  explanation: string;
}

const PC_SCENARIOS: PcScenario[] = [
  {
    title: "Type mismatch",
    desc: "Assigning a string literal to an integer variable.",
    rust: `let x: u32 = "hello";`,
    c: `unsigned x = "hello";`,
    answer: "compile",
    answerLabel: "COMPILE TIME",
    explanation: "The compiler reads the types before producing any binary. No CPU ever runs this line.",
  },
  {
    title: "Out of bounds, literal index",
    desc: "Indexing a 3-element array at the constant index 5.",
    rust: `let arr = [1, 2, 3];\nlet v = arr[5];`,
    c: `int arr[3] = {1, 2, 3};\nint v = arr[5];`,
    answer: "compile",
    answerLabel: "COMPILE TIME (in Rust)",
    explanation: "Rust detects a literal out-of-bounds index at compile time. In C this compiles and corrupts memory at runtime.",
  },
  {
    title: "Out of bounds, variable index",
    desc: "Indexing an array with a value read from the user.",
    rust: `let i = user_input();\nlet v = arr[i];`,
    c: `int i = atoi(argv[1]);\nint v = arr[i];`,
    answer: "runtime",
    answerLabel: "RUNTIME",
    explanation: "The compiler cannot know what user_input() returns. It must be checked when the program runs.",
  },
  {
    title: "const fn factorial(10)",
    desc: "Computing factorial(10) as a const fn / constant expression.",
    rust: `const fn factorial(n: u64) -> u64 { /* ... */ }\nconst F: u64 = factorial(10);`,
    c: `enum { F = 1*2*3*4*5*6*7*8*9*10 };`,
    answer: "compile",
    answerLabel: "COMPILE TIME",
    explanation: "const fn runs during compilation. The result is baked into the binary. No CPU work at runtime.",
  },
  {
    title: "Heap allocation",
    desc: "Allocating memory with Box::new / malloc.",
    rust: `let b = Box::new(42);`,
    c: `int *p = malloc(sizeof(int));`,
    answer: "runtime",
    answerLabel: "RUNTIME",
    explanation: "The allocator asks the OS for memory and the OS decides where. This cannot happen before the program runs.",
  },
  {
    title: "Type inference",
    desc: "Letting the compiler infer the type of x.",
    rust: `let x = 42;`,
    c: `int x = 42; // C makes you write the type`,
    answer: "compile",
    answerLabel: "COMPILE TIME",
    explanation: "The compiler infers u32 from context. x's type is fixed in the binary; the CPU sees a typed slot, not inference.",
  },
  {
    title: "Division by literal zero",
    desc: "Dividing by a literal 0.",
    rust: `let x = 10 / 0;`,
    c: `int x = 10 / 0;`,
    answer: "compile",
    answerLabel: "COMPILE TIME (Rust panics at compile)",
    explanation: "Rust detects division by literal zero during compilation. C compiles it and produces undefined behaviour.",
  },
  {
    title: "Division by variable zero",
    desc: "Dividing by a value read from the user.",
    rust: `let x = 10 / user_input();`,
    c: `int x = 10 / atoi(argv[1]);`,
    answer: "runtime",
    answerLabel: "RUNTIME",
    explanation: "The compiler cannot know if the user input is zero. It is checked when the division executes.",
  },
  {
    title: "Stack overflow from recursion",
    desc: "Unbounded recursion that exhausts the stack.",
    rust: `fn recurse(n: u64) { recurse(n + 1); }`,
    c: `void recurse(unsigned long n) { recurse(n + 1); }`,
    answer: "runtime",
    answerLabel: "RUNTIME",
    explanation: "The OS sets the stack limit. The compiler cannot know the call depth for arbitrary inputs.",
  },
  {
    title: "Bitcoin consensus violation",
    desc: "A block arrives with invalid proof of work.",
    rust: `if !block.meets_pow() {\n    reject(block);\n}`,
    c: `if (!meets_target(hash, bits)) {\n    reject_block();\n}`,
    answer: "runtime",
    answerLabel: "RUNTIME",
    explanation: "Consensus rules are compile-time contracts hardcoded in the binary. Whether a specific block satisfies them is checked at runtime, when the block arrives.",
  },
];

function pcShuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PhaseClassifierWidget() {
  const [lang, setLang] = useState<PcLang>("rust");
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: PC_SCENARIOS.length }, (_, i) => i));
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState<PcPhase | null>(null);
  const [correct, setCorrect] = useState(0);

  // shuffle on mount (kept deterministic for SSR, randomised after hydration)
  useEffect(() => {
    setOrder(pcShuffle(PC_SCENARIOS.length));
  }, []);

  const total = PC_SCENARIOS.length;
  const finished = pos >= total;
  const cur = finished ? null : PC_SCENARIOS[order[pos]];

  const choose = (p: PcPhase) => {
    if (selected || !cur) return;
    setSelected(p);
    if (p === cur.answer) setCorrect((c) => c + 1);
  };
  const next = () => {
    setSelected(null);
    setPos((p) => p + 1);
  };
  const retry = () => {
    setOrder(pcShuffle(total));
    setPos(0);
    setSelected(null);
    setCorrect(0);
  };

  const scoreTone = correct >= 8 ? "cyan" : correct >= 5 ? "amber" : "rose";

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// which phase? you decide."}</span>
        <div className="widget-controls">
          {!finished && (
            <>
              <button type="button" className={`widget-btn ${lang === "rust" ? "is-active" : ""}`} onClick={() => setLang("rust")}>
                Rust
              </button>
              <button type="button" className={`widget-btn ${lang === "c" ? "is-active" : ""}`} onClick={() => setLang("c")}>
                C
              </button>
            </>
          )}
        </div>
      </div>

      {!finished && cur && (
        <div className="pc">
          <div className="pc-progress">
            <span className="pc-progress-label">
              scenario {pos + 1} / {total}
            </span>
            <div className="pc-progress-track">
              <div className="pc-progress-fill" style={{ width: `${(pos / total) * 100}%` }} />
            </div>
            <span className="pc-progress-score">{correct} correct</span>
          </div>

          <div className="pc-card">
            <div className="pc-card-title">{cur.title}</div>
            <pre className="pc-code">
              <code>{lang === "rust" ? cur.rust : cur.c}</code>
            </pre>
            <p className="pc-desc">{cur.desc}</p>

            <div className="pc-choices">
              <button
                type="button"
                className={`pc-choice ${selected ? (cur.answer === "compile" ? "is-correct" : selected === "compile" ? "is-wrong" : "is-dim") : ""}`}
                onClick={() => choose("compile")}
                disabled={!!selected}
              >
                Compile Time
              </button>
              <button
                type="button"
                className={`pc-choice ${selected ? (cur.answer === "runtime" ? "is-correct" : selected === "runtime" ? "is-wrong" : "is-dim") : ""}`}
                onClick={() => choose("runtime")}
                disabled={!!selected}
              >
                Runtime
              </button>
            </div>

            {selected && (
              <div className={`pc-explain ${selected === cur.answer ? "tone-ok" : "tone-bad"}`}>
                <div className="pc-explain-head">
                  {selected === cur.answer ? "correct" : "not quite"} · <span className="pc-answer">{cur.answerLabel}</span>
                </div>
                <p className="pc-explain-body">{cur.explanation}</p>
                <button type="button" className="widget-btn pc-next" onClick={next}>
                  {pos + 1 === total ? "see score →" : "next scenario →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="pc-result">
          <div className={`pc-score tone-${scoreTone}`}>
            You got {correct}/{total} correct
          </div>
          <p className="pc-score-note">
            {correct >= 8
              ? "You can see the line. Compile time and runtime are two different worlds, and you know which is which."
              : correct >= 5
                ? "Getting there. The trick: anything that depends on the world (user input, the OS, the network) is runtime."
                : "The rule of thumb: if the compiler can know it from the source alone, it is compile time. If it needs the running world, it is runtime."}
          </p>
          <button type="button" className="widget-btn pc-retry" onClick={retry}>
            try again (reshuffles)
          </button>
        </div>
      )}

      <p className="widget-caption">
        ten scenarios, shuffled each round. classify each as compile time or runtime, then read why. the line between the two phases is the most important decision in language design.
      </p>
    </div>
  );
}

/* =====================================================================
   20. Array memory explorer: pick a type and base address, edit values,
   and watch the memory layout, index arithmetic, bounds behaviour, and
   cache-line coverage update live (arrays page)
   ===================================================================== */
type AmeType = "u8" | "i32" | "f64" | "char";
type AmeLang = "rust" | "c";

const AME_TYPES: Record<AmeType, { stride: number; rust: string; c: string; showBin: boolean }> = {
  u8: { stride: 1, rust: "u8", c: "uint8_t", showBin: true },
  i32: { stride: 4, rust: "i32", c: "int", showBin: true },
  f64: { stride: 8, rust: "f64", c: "double", showBin: false },
  char: { stride: 4, rust: "char", c: "char32_t", showBin: false },
};

const AME_DEFAULTS = ["10", "20", "30", "40", "50", "60", "70", "80"];
const AME_N = 8;
const AME_LINE = 64;
const AME_LINE_COLORS = ["var(--neon-emerald)", "var(--neon-cyan)", "var(--neon-violet)", "var(--neon-amber)"];

function ameNum(raw: string, type: AmeType): number {
  const n = type === "f64" ? parseFloat(raw) : parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}
function ameHexVal(v: number, type: AmeType): string {
  if (type === "f64") {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, v, false);
    return "0x" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  if (type === "char") {
    const cp = Math.max(0, Math.min(0x10ffff, Math.trunc(v)));
    return "0x" + cp.toString(16).toUpperCase().padStart(8, "0");
  }
  const masked = type === "u8" ? v & 0xff : v >>> 0;
  let hex = masked.toString(16).toUpperCase();
  if (hex.length % 2) hex = "0" + hex;
  if (hex.length < 2) hex = hex.padStart(2, "0");
  return "0x" + hex;
}
function ameBinVal(v: number, type: AmeType): string | null {
  if (type !== "u8" && type !== "i32") return null;
  const masked = type === "u8" ? v & 0xff : v >>> 0;
  const bin = masked.toString(2);
  const width = Math.max(8, Math.ceil(bin.length / 8) * 8);
  const padded = bin.padStart(width, "0");
  return width > 8 ? padded.match(/.{1,8}/g)!.join(" ") : padded;
}
function ameValDisplay(v: number, type: AmeType): string {
  if (type === "char") {
    const cp = Math.max(0, Math.min(0x10ffff, Math.trunc(v)));
    return cp >= 32 && cp < 127 ? `'${String.fromCodePoint(cp)}'` : "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  }
  if (type === "f64") return Number.isInteger(v) ? v.toFixed(1) : String(v);
  return String(type === "u8" ? v & 0xff : v | 0);
}
function ameAddr(base: number, offsetBytes: number): string {
  return "0x" + (base + offsetBytes).toString(16).toUpperCase().padStart(4, "0");
}

function ArrayExplorerWidget() {
  const [type, setType] = useState<AmeType>("i32");
  const [lang, setLang] = useState<AmeLang>("rust");
  const [valuesRaw, setValuesRaw] = useState<string[]>(AME_DEFAULTS);
  const [baseRaw, setBaseRaw] = useState("1000");
  const [idxRaw, setIdxRaw] = useState("2");

  const stride = AME_TYPES[type].stride;
  const base = (() => {
    const b = parseInt(baseRaw || "0", 16);
    return Number.isFinite(b) ? b : 0;
  })();
  const baseHex = base.toString(16).toUpperCase().padStart(4, "0");
  const nums = valuesRaw.map((r) => ameNum(r, type));
  const idx = (() => {
    const n = parseInt(idxRaw, 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const inBounds = idx >= 0 && idx < AME_N;

  const setValue = (i: number, raw: string) => setValuesRaw((cur) => cur.map((v, j) => (j === i ? raw : v)));

  const elemsPerLine = Math.floor(AME_LINE / stride);
  const lineOf = (i: number) => Math.floor((i * stride) / AME_LINE);
  const totalLines = lineOf(AME_N - 1) + 1;

  const offset = idx * stride;
  const calcAddr = ameAddr(base, offset);

  // live code preview
  const code = (() => {
    const list = nums.map((n) => ameValDisplay(n, type)).join(", ");
    if (lang === "rust") {
      return [
        `let arr: [${AME_TYPES[type].rust}; 8] = [${list}];`,
        `let i = ${idx};`,
        `println!("{}", arr[i]);  // ${inBounds ? ameValDisplay(nums[idx], type) : "panics: index out of bounds"}`,
        `// addr: 0x${baseHex} + ${idx} * ${stride} = ${calcAddr}`,
      ].join("\n");
    }
    return [
      `${AME_TYPES[type].c} arr[8] = { ${list} };`,
      `int i = ${idx};`,
      `printf("%d\\n", arr[i]);    // ${inBounds ? ameValDisplay(nums[idx], type) : "UB: out of bounds"}`,
      `printf("%d\\n", *(arr+i));  // same address: ${calcAddr}`,
    ].join("\n");
  })();

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// walk the array yourself"}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${lang === "rust" ? "is-active" : ""}`} onClick={() => setLang("rust")}>
            Rust
          </button>
          <button type="button" className={`widget-btn ${lang === "c" ? "is-active" : ""}`} onClick={() => setLang("c")}>
            C
          </button>
        </div>
      </div>

      <div className="ame">
        {/* TOP: configuration */}
        <div className="ame-config">
          <div className="ame-row">
            <span className="ame-col-title">element type</span>
            <div className="ame-type-tabs">
              {(Object.keys(AME_TYPES) as AmeType[]).map((t) => (
                <button key={t} type="button" className={`widget-btn ${type === t ? "is-active" : ""}`} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="ame-row">
            <span className="ame-col-title">array values (editable)</span>
            <div className="ame-values">
              {valuesRaw.map((v, i) => (
                <label key={i} className="ame-cell">
                  <span className="ame-cell-idx">[{i}]</span>
                  <input value={v} inputMode="numeric" onChange={(e) => setValue(i, e.target.value)} />
                </label>
              ))}
            </div>
          </div>

          <div className="ame-row">
            <span className="ame-col-title">base address</span>
            <div className="ame-base">
              <span className="ame-base-prefix">0x</span>
              <input value={baseRaw} onChange={(e) => setBaseRaw(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8))} aria-label="base address in hex" />
            </div>
          </div>
        </div>

        {/* BOTTOM: memory layout */}
        <div className="ame-mem">
          <div className={`ame-mem-grid ${AME_TYPES[type].showBin ? "with-bin" : "no-bin"}`}>
            <div className="ame-mr ame-mhead">
              <span className="ame-mh">address</span>
              <span className="ame-mh">index</span>
              <span className="ame-mh">hex</span>
              {AME_TYPES[type].showBin && <span className="ame-mh">binary</span>}
              <span className="ame-mh">value</span>
            </div>
            {nums.map((n, i) => {
              const lineColor = AME_LINE_COLORS[lineOf(i) % AME_LINE_COLORS.length];
              return (
                <div key={i} className="ame-mr" style={{ ["--ame-line" as string]: lineColor }}>
                  <span className="ame-addr">{ameAddr(base, i * stride)}</span>
                  <span className="ame-idx">[{i}]</span>
                  <span className="ame-hex">{ameHexVal(n, type)}</span>
                  {AME_TYPES[type].showBin && <span className="ame-bin">{ameBinVal(n, type)}</span>}
                  <span className="ame-val">{ameValDisplay(n, type)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* index calculator */}
        <div className="ame-calc">
          <div className="ame-calc-head">
            <span className="ame-col-title">calculate arr[i]</span>
            <label className="ame-calc-input">
              i =
              <input value={idxRaw} inputMode="numeric" onChange={(e) => setIdxRaw(e.target.value.replace(/[^0-9-]/g, ""))} />
            </label>
          </div>
          <pre className="ame-calc-math">
            <code>{`arr[${idx}] = base + (i × stride)
       = 0x${baseHex} + (${idx} × ${stride})
       = 0x${baseHex} + ${offset}
       = ${calcAddr}`}</code>
          </pre>
          {inBounds ? (
            <div className="ame-calc-result">→ value: <strong>{ameValDisplay(nums[idx], type)}</strong></div>
          ) : lang === "rust" ? (
            <div className="ame-oob rust">
              index out of bounds: the len is 8 but the index is {idx}. Rust panics cleanly here, no memory is read.
            </div>
          ) : (
            <div className="ame-oob c">
              arr[{idx}] reads address {calcAddr}, outside the array. Undefined behaviour in C: could be another variable&apos;s memory, could be garbage, could look correct and corrupt silently.
            </div>
          )}
        </div>

        {/* live code */}
        <pre className="ame-code">
          <code>{code}</code>
        </pre>

        {/* cache line */}
        <div className="ame-cache">
          <div className="ame-col-title">64-byte cache line coverage</div>
          <div className="ame-cache-bar">
            {nums.map((_, i) => (
              <span key={i} className="ame-cache-seg" style={{ background: AME_LINE_COLORS[lineOf(i) % AME_LINE_COLORS.length] }}>
                {i}
              </span>
            ))}
          </div>
          <p className="ame-cache-note">
            A 64-byte cache line holds <strong>{elemsPerLine}</strong> {type} values.{" "}
            {totalLines === 1
              ? `All 8 of your elements fit in ONE cache line. Reading arr[0] loads every one of them; the next 7 reads cost nothing.`
              : `Your 8 elements span ${totalLines} cache lines, shown as ${totalLines} colored bands above.`}
          </p>
        </div>
      </div>

      <p className="widget-caption">
        switch the element type to change the stride and watch every address recompute. edit a value to see its hex and binary. push the index past 7 to see how Rust and C diverge on an out-of-bounds access.
      </p>
    </div>
  );
}

/* =====================================================================
   21. Linked list visualiser: build a chain with scattered heap addresses,
   walk it, splice and remove nodes, compare cache behaviour with an array,
   and watch the per-operation complexity tally (linked-list page)
   ===================================================================== */
type LlvLang = "rust" | "c";
type LlvPos = "front" | "back" | "after";
interface LlvNode {
  id: number;
  value: number;
  addr: string;
}

function llvAddr(): string {
  const hi = (0x5500 + Math.floor(Math.random() * 0x2aff)).toString(16);
  const mid = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  const lo = (Math.floor(Math.random() * 0x400) * 0x10).toString(16).padStart(4, "0");
  return "0x" + hi + mid + lo;
}

const LLV_SEED: LlvNode[] = [
  { id: 0, value: 10, addr: "0x5591a2b30010" },
  { id: 1, value: 20, addr: "0x7f3a0000b020" },
  { id: 2, value: 30, addr: "0x4c20d18a3b80" },
];

function LinkedListVisualiserWidget() {
  const [nodes, setNodes] = useState<LlvNode[]>(LLV_SEED);
  const [lang, setLang] = useState<LlvLang>("rust");
  const [compare, setCompare] = useState(false);
  const [addValue, setAddValue] = useState("42");
  const [pos, setPos] = useState<LlvPos>("front");
  const [afterIdx, setAfterIdx] = useState("0");
  const [removeIdx, setRemoveIdx] = useState("0");
  const [log, setLog] = useState<Array<{ sign: "+" | "-"; text: string; big: string }>>([]);
  const [counters, setCounters] = useState({ comparisons: 0, derefs: 0 });
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [newId, setNewId] = useState<number | null>(null);
  const idRef = useRef(3);

  const pushLog = (sign: "+" | "-", text: string, big: string) =>
    setLog((cur) => [{ sign, text, big }, ...cur].slice(0, 6));
  const bump = (walk: number) =>
    setCounters((c) => ({ comparisons: c.comparisons + walk, derefs: c.derefs + walk }));

  const addNode = () => {
    const v = parseInt(addValue, 10);
    const value = Number.isFinite(v) ? v : 0;
    const node: LlvNode = { id: idRef.current++, value, addr: llvAddr() };
    setNewId(node.id);
    window.setTimeout(() => setNewId(null), 450);

    if (pos === "front") {
      setNodes((cur) => [node, ...cur]);
      pushLog("+", `Add ${value} at front`, "O(1) head pointer updated");
      bump(0);
    } else if (pos === "back") {
      const walk = nodes.length;
      setNodes((cur) => [...cur, node]);
      pushLog("+", `Add ${value} at back`, `O(n) walked ${walk} node${walk === 1 ? "" : "s"} to the tail`);
      bump(walk);
    } else {
      const i = Math.max(0, Math.min(nodes.length - 1, parseInt(afterIdx, 10) || 0));
      setNodes((cur) => [...cur.slice(0, i + 1), node, ...cur.slice(i + 1)]);
      pushLog("+", `Add ${value} after node ${i}`, `O(1) had a pointer to node ${i}`);
      bump(i);
    }
  };

  const removeNode = () => {
    const i = parseInt(removeIdx, 10);
    if (!Number.isInteger(i) || i < 0 || i >= nodes.length) {
      pushLog("-", `No node at index ${removeIdx || "?"}`, "nothing to remove");
      return;
    }
    const target = nodes[i];
    setRemovingId(target.id);
    window.setTimeout(() => {
      setNodes((cur) => cur.filter((n) => n.id !== target.id));
      setRemovingId(null);
      if (i > 0) {
        setFlashIdx(i - 1);
        window.setTimeout(() => setFlashIdx(null), 600);
      }
      pushLog("-", `Remove node ${i}`, i === 0 ? "O(1) head pointer updated" : `O(n) walked ${i} to find predecessor`);
      bump(i);
    }, 260);
  };

  const reset = () => {
    setNodes(LLV_SEED.map((n) => ({ ...n })));
    setLog([]);
    setCounters({ comparisons: 0, derefs: 0 });
    setRemovingId(null);
    setFlashIdx(null);
    idRef.current = 3;
  };

  const cacheMisses = Math.round(counters.derefs * 0.7);
  const nullLabel = lang === "rust" ? "None" : "NULL";

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// build and walk the chain"}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${lang === "rust" ? "is-active" : ""}`} onClick={() => setLang("rust")}>
            Rust
          </button>
          <button type="button" className={`widget-btn ${lang === "c" ? "is-active" : ""}`} onClick={() => setLang("c")}>
            C
          </button>
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      {/* controls */}
      <div className="llv-controls">
        <div className="llv-ctl-row">
          <span className="llv-ctl-label">add node</span>
          <input
            className="llv-num"
            value={addValue}
            inputMode="numeric"
            onChange={(e) => setAddValue(e.target.value.replace(/[^0-9-]/g, ""))}
            aria-label="value to add"
          />
          <div className="llv-seg">
            <button type="button" className={pos === "front" ? "is-active" : ""} onClick={() => setPos("front")}>
              at front
            </button>
            <button type="button" className={pos === "back" ? "is-active" : ""} onClick={() => setPos("back")}>
              at back
            </button>
            <button type="button" className={pos === "after" ? "is-active" : ""} onClick={() => setPos("after")}>
              after node
            </button>
          </div>
          {pos === "after" && (
            <input
              className="llv-num"
              value={afterIdx}
              inputMode="numeric"
              onChange={(e) => setAfterIdx(e.target.value.replace(/[^0-9]/g, ""))}
              aria-label="insert after index"
            />
          )}
          <button type="button" className="widget-btn llv-go" onClick={addNode}>
            + add node
          </button>
        </div>

        <div className="llv-ctl-row">
          <span className="llv-ctl-label">remove node</span>
          <input
            className="llv-num"
            value={removeIdx}
            inputMode="numeric"
            onChange={(e) => setRemoveIdx(e.target.value.replace(/[^0-9]/g, ""))}
            aria-label="index to remove"
          />
          <button type="button" className="widget-btn" onClick={removeNode}>
            &#10005; remove
          </button>
          <button type="button" className={`widget-btn ${compare ? "is-active" : ""}`} onClick={() => setCompare((c) => !c)}>
            compare with array
          </button>
        </div>
      </div>

      {/* array compare view */}
      {compare && (
        <div className="llv-compare">
          <div className="llv-compare-title">same values as an array (contiguous)</div>
          <div className="llv-arr-row">
            {nodes.map((n, i) => (
              <div key={n.id} className="llv-arr-cell">
                <span className="llv-arr-val">{n.value}</span>
                <span className="llv-arr-addr">{"0x" + (0x1000 + i * 4).toString(16)}</span>
              </div>
            ))}
          </div>
          <div className="llv-cacheline llv-cacheline-array">
            <span className="llv-cl-bar full" />
            cache line: every element loaded in one 64-byte fetch
          </div>
        </div>
      )}

      {/* linked list visualisation */}
      <div className="llv-viz">
        {nodes.length === 0 && <div className="llv-empty">empty list. head points at {nullLabel}.</div>}
        {nodes.map((n, i) => (
          <div className="llv-unit" key={n.id}>
            <div
              className={`llv-node ${removingId === n.id ? "is-removing" : ""} ${newId === n.id ? "is-new" : ""} ${
                compare ? (i === 0 ? "hit" : "miss") : ""
              }`}
            >
              <div className="llv-node-val">{n.value}</div>
              <div className="llv-node-addr">{n.addr}</div>
              <div className="llv-node-idx">
                node[{i}]
                {i === 0 ? <span className="llv-head"> · HEAD</span> : null}
              </div>
              {compare && <span className={`llv-cl-badge ${i === 0 ? "hit" : "miss"}`}>{i === 0 ? "L1 hit" : "miss ✕"}</span>}
            </div>
            <div className={`llv-arrow ${flashIdx === i ? "is-flash" : ""}`} aria-hidden="true">
              <span className="llv-arrow-dot" />
            </div>
          </div>
        ))}
        <div className="llv-null">{nullLabel}</div>
      </div>

      {/* operation log + counters */}
      <div className="llv-foot">
        <div className="llv-logbox">
          <div className="llv-foot-title">operation log</div>
          {log.length === 0 && <div className="llv-log-empty">add or remove a node to begin.</div>}
          {log.map((e, i) => (
            <div key={i} className={`llv-log-row ${e.sign === "+" ? "add" : "del"}`}>
              <span className="llv-log-sign">[{e.sign}]</span>
              <span className="llv-log-text">{e.text}</span>
              <span className="llv-log-big">{e.big}</span>
            </div>
          ))}
        </div>
        <div className="llv-counters">
          <div className="llv-foot-title">cost so far</div>
          <div className="llv-counter">
            <span>comparisons</span>
            <strong>{counters.comparisons}</strong>
          </div>
          <div className="llv-counter">
            <span>pointer dereferences</span>
            <strong>{counters.derefs}</strong>
          </div>
          <div className="llv-counter" title="assuming 70% of pointer chases miss L1 cache on a warm heap">
            <span>cache misses (est.)</span>
            <strong className="miss">{cacheMisses}</strong>
          </div>
        </div>
      </div>

      <p className="widget-caption">
        every node gets a scattered heap address, never sequential like an array. add at front (O(1)), at back (O(n) walk), or after a node you already hold (O(1)). toggle compare with array to see why the linked list misses cache on every step.
      </p>
    </div>
  );
}

/* =====================================================================
   22. Hash visualiser: type any input, watch its fingerprint change, the
   avalanche of flipped bits when one character moves, and where the key
   lands in a hash map. FNV-1a is computed in pure JS; SHA-256 runs through
   the browser's SubtleCrypto. (hashing page)
   ===================================================================== */
type HvMode = "fnv" | "sha";

// FNV-1a, 64-bit, returned as 8 big-endian bytes so the rest of the widget
// can treat FNV and SHA digests identically (just different lengths).
function hvFnv1aBytes(input: string): number[] {
  const data = new TextEncoder().encode(input);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = (1n << 64n) - 1n;
  for (const b of data) {
    h ^= BigInt(b);
    h = (h * prime) & mask;
  }
  const out: number[] = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = Number((h >> BigInt((7 - i) * 8)) & 0xffn);
  return out;
}

async function hvSha256Bytes(input: string): Promise<number[]> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf));
}

const hvHex = (b: number) => b.toString(16).padStart(2, "0");
const hvBytesHex = (bytes: number[]) => bytes.map(hvHex).join("");

// Reduce a big-endian byte string modulo the capacity. Capacities here are
// all <= 256, so r * 256 + b never overflows a JS safe integer.
function hvBucket(bytes: number[], cap: number): number {
  let r = 0;
  for (const b of bytes) r = (r * 256 + b) % cap;
  return r;
}

// Which output bits flipped between two digests (XOR, expanded to bits).
function hvFlips(a: number[], b: number[]): boolean[] {
  const bits: boolean[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ^ b[i];
    for (let k = 7; k >= 0; k--) bits.push(((x >> k) & 1) === 1);
  }
  return bits;
}

// The "one character changed" twin: bump the last character by one code point.
function hvSibling(input: string): string {
  if (input.length === 0) return "";
  const last = input.charCodeAt(input.length - 1);
  return input.slice(0, -1) + String.fromCharCode(last + 1);
}

const HV_CAPS = [8, 16, 64, 256];
const HV_SEED = ["alice", "bob", "carol"];

function HashVisualiserWidget() {
  const [mode, setMode] = useState<HvMode>("fnv");
  const [input, setInput] = useState("alice");
  const [capacity, setCapacity] = useState(8);
  const [inserted, setInserted] = useState<string[]>(HV_SEED);
  const [subtleOk, setSubtleOk] = useState(true);

  const sib = hvSibling(input);

  // Every string whose digest we need this render.
  const needed = useMemo(() => {
    const s = new Set<string>();
    if (input) {
      s.add(input);
      s.add(sib);
    }
    for (const k of inserted) s.add(k);
    return Array.from(s);
  }, [input, sib, inserted]);

  // Digests live in state because SHA-256 is async. Lazy-initialised with the
  // default FNV view so the first paint already shows a real fingerprint.
  const [digests, setDigests] = useState<Record<string, number[]>>(() => {
    const o: Record<string, number[]> = {};
    for (const k of ["alice", "alicf", "bob", "carol"]) o[k] = hvFnv1aBytes(k);
    return o;
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const out: Record<string, number[]> = {};
      if (mode === "fnv") {
        for (const k of needed) out[k] = hvFnv1aBytes(k);
        if (!cancelled) {
          setDigests(out);
          setSubtleOk(true);
        }
        return;
      }
      if (typeof crypto === "undefined" || !crypto.subtle) {
        if (!cancelled) setSubtleOk(false);
        return;
      }
      try {
        for (const k of needed) out[k] = await hvSha256Bytes(k);
        if (!cancelled) {
          setDigests(out);
          setSubtleOk(true);
        }
      } catch {
        if (!cancelled) setSubtleOk(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mode, needed]);

  const cur = digests[input];
  const sibDig = digests[sib];

  const bits = cur && sibDig ? hvFlips(cur, sibDig) : [];
  const flips = bits.filter(Boolean).length;
  const pct = bits.length ? Math.round((flips / bits.length) * 100) : 0;

  // Where every inserted key lands at the current capacity.
  const placement = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const k of inserted) {
      const d = digests[k];
      if (!d) continue;
      const idx = hvBucket(d, capacity);
      (map[idx] ||= []).push(k);
    }
    return map;
  }, [inserted, digests, capacity]);

  const liveBucket = cur ? hvBucket(cur, capacity) : -1;
  const collidesWith =
    liveBucket >= 0 ? (placement[liveBucket] || []).filter((k) => k !== input) : [];

  const curHex = cur ? hvBytesHex(cur) : "";
  const shownHex = mode === "fnv" ? curHex : curHex.slice(0, 16) + (curHex ? "..." : "");
  const compact = capacity > 16;

  const drop = () => {
    if (!input) return;
    setInserted((prev) => (prev.includes(input) ? prev : [...prev, input]));
  };

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// see the fingerprint change"}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${mode === "fnv" ? "is-active" : ""}`} onClick={() => setMode("fnv")}>
            Non-crypto (FNV-1a)
          </button>
          <button type="button" className={`widget-btn ${mode === "sha" ? "is-active" : ""}`} onClick={() => setMode("sha")}>
            SHA-256
          </button>
        </div>
      </div>

      <div className="hv">
        {/* TOP: input */}
        <div className="hv-panel">
          <span className="hv-panel-title">input</span>
          <input
            className="hv-input"
            value={input}
            placeholder="Type anything here..."
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            aria-label="hash input"
          />
        </div>

        {/* MIDDLE: hash output */}
        <div className="hv-panel">
          <span className="hv-panel-title">{mode === "fnv" ? "fnv-1a output" : "sha-256 output"}</span>
          {!cur ? (
            mode === "sha" && !subtleOk ? (
              <p className="hv-note">SubtleCrypto is unavailable in this browser, so SHA-256 cannot be computed here. Switch to FNV-1a above.</p>
            ) : (
              <p className="hv-note">{input ? "computing fingerprint..." : "type something above to take its fingerprint."}</p>
            )
          ) : mode === "fnv" ? (
            <div className="hv-fnv">
              <div className="hv-fnv-hash">
                FNV-1a hash: <span className="hv-hex">0x{curHex}</span>
              </div>
              <div className="hv-fnv-rows">
                <div>Bucket index (capacity 8): <strong>{hvBucket(cur, 8)}</strong></div>
                <div>Bucket index (capacity 16): <strong>{hvBucket(cur, 16)}</strong></div>
                <div>Bucket index (capacity 256): <strong>{hvBucket(cur, 256)}</strong></div>
              </div>
            </div>
          ) : (
            <div className="hv-sha">
              <div className="hv-sha-label">SHA-256:</div>
              <div className="hv-bytes">
                {cur.map((b, i) => (
                  <span key={i} className="hv-byte">{hvHex(b)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AVALANCHE */}
        <div className="hv-panel">
          <span className="hv-panel-title">avalanche: one character changed</span>
          {cur && sibDig && input ? (
            <>
              <div className="hv-ava-rows">
                <div className="hv-ava-row">
                  <span className="hv-ava-label">input 1</span>
                  <span className="hv-ava-key">&quot;{input}&quot;</span>
                  <span className="hv-ava-mini">{hvBytesHex(cur).slice(0, 16)}...</span>
                </div>
                <div className="hv-ava-row">
                  <span className="hv-ava-label">input 2</span>
                  <span className="hv-ava-key">&quot;{sib}&quot;</span>
                  <span className="hv-ava-mini">{hvBytesHex(sibDig).slice(0, 16)}...</span>
                </div>
              </div>
              <div className={`hv-bits ${mode}`}>
                {bits.map((f, i) => (
                  <span key={i} className={`hv-bit ${f ? "flip" : ""}`} />
                ))}
              </div>
              <div className="hv-ava-count">
                <strong>{flips}</strong> / {bits.length} bits changed ({pct}%)
              </div>
            </>
          ) : (
            <p className="hv-note">type at least one character to see the avalanche.</p>
          )}
        </div>

        {/* BOTTOM: hash map simulator */}
        <div className="hv-panel">
          <span className="hv-panel-title">see it land in a hash map</span>
          <div className="hv-cap-row">
            <span className="hv-cap-label">capacity</span>
            <div className="hv-cap-tabs">
              {HV_CAPS.map((c) => (
                <button key={c} type="button" className={`widget-btn ${capacity === c ? "is-active" : ""}`} onClick={() => setCapacity(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {cur && (
            <pre className="hv-math">
              <code>{`hash("${input}") = 0x${shownHex}
0x${shownHex} % ${capacity} = ${liveBucket}
lands in bucket ${liveBucket}`}</code>
            </pre>
          )}

          {collidesWith.length > 0 && (
            <div className="hv-collision">
              Collision! &quot;{input}&quot; and &quot;{collidesWith[0]}&quot; both land in bucket {liveBucket}
            </div>
          )}

          <div className={`hv-buckets ${compact ? "is-compact" : ""}`}>
            {Array.from({ length: capacity }, (_, i) => {
              const keys = placement[i] || [];
              const isLive = i === liveBucket;
              const isCollision = keys.length > 1 || (isLive && keys.some((k) => k !== input));
              return (
                <div
                  key={i}
                  className={`hv-bucket ${isLive ? "is-live" : ""} ${isCollision ? "is-collision" : ""} ${keys.length ? "is-filled" : ""}`}
                  title={keys.join(", ")}
                >
                  <span className="hv-bucket-idx">{i}</span>
                  {!compact && keys.length > 0 && <span className="hv-bucket-keys">{keys.join(", ")}</span>}
                  {compact && keys.length > 0 && <span className="hv-bucket-dot" />}
                  {isCollision && <span className="hv-chain" aria-hidden="true">⛓</span>}
                </div>
              );
            })}
          </div>

          <div className="hv-sim-controls">
            <button type="button" className="widget-btn" onClick={drop} disabled={!input}>
              drop &quot;{input || "..."}&quot; into map
            </button>
            <button type="button" className="widget-btn" onClick={() => setInserted([])}>
              clear map
            </button>
            <button type="button" className="widget-btn" onClick={() => setInserted(HV_SEED)}>
              reset
            </button>
            <span className="hv-sim-count">{inserted.length} keys in map</span>
          </div>
        </div>
      </div>

      <p className="widget-caption">
        type to watch the fingerprint recompute on every keystroke. FNV-1a is a fast non-cryptographic hash computed in JavaScript; SHA-256 runs in your browser via SubtleCrypto. The avalanche grid shows which output bits flip when a single input character moves. Drop keys into the map and shrink the capacity to force a collision.
      </p>
    </div>
  );
}

/* =====================================================================
   23. Search race: linear vs binary search on the same array. Animates
   both at once, counts real comparisons, gates binary on sorted data, and
   demonstrates the (lo + hi) integer overflow bug. (searching page)
   ===================================================================== */
type SrMode = "race" | "step";

interface SrStep {
  lo: number;
  hi: number;
  mid: number;
}

function srBinarySteps(n: number, target: number): SrStep[] {
  const steps: SrStep[] = [];
  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    steps.push({ lo, hi, mid });
    if (mid === target) break;
    else if (mid < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return steps;
}

// Simulate 32-bit signed wraparound for the overflow demo.
function srWrap32(v: number): number {
  let x = v % 4294967296;
  if (x > 2147483647) x -= 4294967296;
  else if (x < -2147483648) x += 4294967296;
  return x;
}

const srFmt = (n: number) => n.toLocaleString("en-US");

function SearchRaceWidget() {
  const [exp, setExp] = useState(6); // n = 10^exp
  const n = Math.max(2, Math.round(10 ** exp));
  const [sorted, setSorted] = useState(true);
  const [mode, setMode] = useState<SrMode>("race");
  const [targetRaw, setTargetRaw] = useState("847293");
  const [showOverflow, setShowOverflow] = useState(false);

  const [binIdx, setBinIdx] = useState(0);
  const [linCount, setLinCount] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const target = (() => {
    const t = parseInt(targetRaw, 10);
    return Number.isFinite(t) ? t : 0;
  })();

  const found = target >= 0 && target < n;
  // Sorted: value == index. Unsorted: a deterministic shuffled position.
  const linearPos = found ? (sorted ? target : (Math.abs(target) * 2654435761) % n) : -1;
  const finalLinear = found ? linearPos + 1 : n;

  const steps = useMemo(() => (sorted ? srBinarySteps(n, target) : []), [sorted, n, target]);
  const finalBinary = steps.length;

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setBinIdx(0);
    setLinCount(0);
    setPhase("idle");
  }, []);

  // Reset whenever the configuration changes.
  useEffect(() => {
    reset();
  }, [exp, sorted, targetRaw, reset]);

  // Cancel any animation on unmount.
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const runRace = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase("running");
    const stepMs = 240;
    const binDur = Math.max(1, finalBinary) * stepMs;
    const linDur = Math.min(5200, Math.max(1600, binDur * 3));
    startRef.current = performance.now();
    const tick = (now: number) => {
      const el = now - startRef.current;
      const bi = sorted ? Math.min(Math.floor(el / stepMs), finalBinary) : 0;
      const lp = Math.min(el / linDur, 1);
      setBinIdx(bi);
      setLinCount(Math.round(lp * finalLinear));
      const binDone = !sorted || bi >= finalBinary;
      const linDone = lp >= 1;
      if (binDone && linDone) {
        setBinIdx(finalBinary);
        setLinCount(finalLinear);
        setPhase("done");
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finalBinary, finalLinear, sorted]);

  const stepOnce = useCallback(() => {
    setPhase((p) => (p === "done" ? p : "running"));
    setBinIdx((b) => (sorted ? Math.min(b + 1, finalBinary) : b));
    setLinCount((c) => Math.min(c + 1, finalLinear));
  }, [sorted, finalBinary, finalLinear]);

  // Step-mode completion: the race is decided once binary finishes.
  useEffect(() => {
    if (phase !== "running") return;
    const binDone = sorted && binIdx >= finalBinary && finalBinary > 0;
    const linDone = linCount >= finalLinear;
    if ((mode === "step" && binDone) || linDone) setPhase("done");
  }, [phase, mode, sorted, binIdx, finalBinary, linCount, finalLinear]);

  const binStepShown = Math.min(binIdx, steps.length);
  const curWin = binStepShown > 0 ? steps[binStepShown - 1] : { lo: 0, hi: n - 1, mid: -1 };
  const loFrac = curWin.lo / n;
  const hiFrac = (curWin.hi + 1) / n;
  const midFrac = curWin.mid >= 0 ? (curWin.mid + 0.5) / n : -1;

  const linEndFrac = found ? (linearPos + 1) / n : 1;
  const linMarkerFrac = (finalLinear > 0 ? linCount / finalLinear : 0) * linEndFrac;

  const ratio = finalBinary > 0 ? Math.max(1, Math.round(finalLinear / finalBinary)) : 0;
  const pct = (x: number) => `${(x * 100).toFixed(4)}%`;

  // Overflow demo numbers.
  const oLo = 1500000000;
  const oHi = 2000000000;
  const oBad = Math.trunc(srWrap32(oLo + oHi) / 2);
  const oGood = oLo + Math.trunc((oHi - oLo) / 2);

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// watch them search"}</span>
        <div className="widget-controls">
          <button type="button" className={`widget-btn ${mode === "race" ? "is-active" : ""}`} onClick={() => setMode("race")}>
            Race
          </button>
          <button type="button" className={`widget-btn ${mode === "step" ? "is-active" : ""}`} onClick={() => setMode("step")}>
            Step
          </button>
        </div>
      </div>

      <div className="sr">
        {/* CONFIG */}
        <div className="sr-config">
          <label className="sr-field sr-field-wide">
            <span className="sr-field-label">array size&nbsp;&nbsp;n = {srFmt(n)}</span>
            <input
              type="range"
              min={1}
              max={6}
              step={0.05}
              value={exp}
              onChange={(e) => setExp(parseFloat(e.target.value))}
              className="sr-slider"
              aria-label="array size"
            />
          </label>
          <label className="sr-field">
            <span className="sr-field-label">target value</span>
            <div className="sr-target">
              <input
                value={targetRaw}
                inputMode="numeric"
                onChange={(e) => setTargetRaw(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
                aria-label="target value"
              />
              <button type="button" className="widget-btn" onClick={() => setTargetRaw(String(Math.floor(Math.random() * n)))}>
                random
              </button>
            </div>
          </label>
          <label className="sr-field">
            <span className="sr-field-label">data</span>
            <div className="sr-data-tabs">
              <button type="button" className={`widget-btn ${sorted ? "is-active" : ""}`} onClick={() => setSorted(true)}>
                Sorted
              </button>
              <button type="button" className={`widget-btn ${!sorted ? "is-active" : ""}`} onClick={() => setSorted(false)}>
                Unsorted
              </button>
            </div>
          </label>
        </div>

        {/* LINEAR ROW */}
        <div className="sr-row">
          <div className="sr-row-head">
            <span className="sr-row-name sr-linear">linear search</span>
            <span className="sr-row-stat">
              comparisons: <strong>{srFmt(linCount)}</strong>
            </span>
          </div>
          <div className="sr-track">
            <div className="sr-lin-fill" style={{ width: pct(linMarkerFrac) }} />
            <div className={`sr-marker sr-lin-marker ${phase === "done" && found ? "is-found" : ""}`} style={{ left: pct(linMarkerFrac) }} />
          </div>
        </div>

        {/* BINARY ROW */}
        <div className={`sr-row ${!sorted ? "is-disabled" : ""}`}>
          <div className="sr-row-head">
            <span className="sr-row-name sr-binary">binary search</span>
            <span className="sr-row-stat">
              {sorted ? (
                <>comparisons: <strong>{srFmt(binStepShown)}</strong></>
              ) : (
                <span className="sr-needs-sorted" title="Binary search requires sorted data">requires sorted data</span>
              )}
            </span>
          </div>
          <div className="sr-track">
            {sorted ? (
              <>
                <div className="sr-bin-elim" style={{ left: 0, width: pct(loFrac) }} />
                <div className="sr-bin-active" style={{ left: pct(loFrac), width: pct(Math.max(0, hiFrac - loFrac)) }} />
                <div className="sr-bin-elim" style={{ left: pct(hiFrac), width: pct(Math.max(0, 1 - hiFrac)) }} />
                {midFrac >= 0 && (
                  <div className={`sr-marker sr-bin-marker ${phase === "done" && found ? "is-found" : ""}`} style={{ left: pct(midFrac) }} />
                )}
              </>
            ) : (
              <div className="sr-track-disabled">binary search needs sorted data</div>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="sr-controls">
          {mode === "race" ? (
            <button type="button" className="widget-btn is-go" onClick={runRace} disabled={phase === "running"}>
              {phase === "done" ? "race again" : "race"}
            </button>
          ) : (
            <button type="button" className="widget-btn is-go" onClick={stepOnce} disabled={phase === "done"}>
              step
            </button>
          )}
          <button type="button" className="widget-btn" onClick={reset}>
            reset
          </button>
          <span className="sr-status">
            {found ? (
              <>target lands at index <strong>{srFmt(linearPos)}</strong></>
            ) : (
              <>target {srFmt(target)} is not in the array</>
            )}
          </span>
        </div>

        {/* RESULTS */}
        {phase === "done" && (
          <div className="sr-results">
            <div className="sr-result-rows">
              <div className="sr-result-row">
                <span className="sr-result-name sr-linear">linear</span>
                <span className="sr-result-val">{srFmt(finalLinear)} comparisons</span>
              </div>
              <div className="sr-result-row">
                <span className="sr-result-name sr-binary">binary</span>
                <span className="sr-result-val">{sorted ? `${srFmt(finalBinary)} comparisons` : "disabled (unsorted)"}</span>
              </div>
              {sorted && ratio > 1 && (
                <div className="sr-ratio">{srFmt(ratio)}x fewer</div>
              )}
            </div>
            {sorted && (
              <>
                <div className="sr-chart">
                  <div className="sr-chart-row">
                    <span className="sr-chart-label sr-linear">linear</span>
                    <div className="sr-chart-bar sr-linear-bar" style={{ width: "100%" }} />
                  </div>
                  <div className="sr-chart-row">
                    <span className="sr-chart-label sr-binary">binary</span>
                    <div className="sr-chart-bar sr-binary-bar" style={{ width: pct(Math.max(0.015, finalBinary / finalLinear)) }} />
                  </div>
                </div>
                <p className="sr-results-note">Binary search eliminated 50% of the remaining candidates on every step.</p>
              </>
            )}
          </div>
        )}

        {/* OVERFLOW DEMO */}
        <div className="sr-overflow">
          <button type="button" className="widget-btn" onClick={() => setShowOverflow((v) => !v)}>
            {showOverflow ? "hide the overflow bug" : "show the overflow bug"}
          </button>
          {showOverflow && (
            <pre className="sr-overflow-body">
              <code>{`lo = ${srFmt(oLo)}    hi = ${srFmt(oHi)}

lo + hi          = ${srFmt(oLo + oHi)}   (exceeds INT_MAX 2,147,483,647)
(lo + hi) / 2    = ${srFmt(oBad)}   <- wraps negative, out of bounds
lo + (hi-lo) / 2 = ${srFmt(oGood)}   <- correct

This one line shipped in Java's binary search in 1998 and
went unnoticed until 2006. Nine years in production.`}</code>
            </pre>
          )}
        </div>
      </div>

      <p className="widget-caption">
        drag the size up to one billion and watch the comparison counts diverge. linear scans element by element; binary throws away half the array on every step. switch to unsorted to see binary search lock out, because it has no order to exploit. the comparison counts are the real worst-case numbers for the size you pick, computed live.
      </p>
    </div>
  );
}

/* =====================================================================
   TCP three-way handshake: step SYN / SYN-ACK / ACK, then send data
   ===================================================================== */
const TCP_STEPS: Array<{
  dir: "cs" | "sc";
  label: string;
  color: string;
  client: string;
  server: string;
  note: string;
}> = [
  {
    dir: "cs",
    label: "",
    color: "var(--fg-mute)",
    client: "CLOSED",
    server: "LISTEN",
    note: "The server is listening. The client has not reached out yet.",
  },
  {
    dir: "cs",
    label: "SYN  seq=100",
    color: "var(--neon-cyan)",
    client: "SYN-SENT",
    server: "LISTEN",
    note: "1 — Client sends SYN with its starting sequence number (100).",
  },
  {
    dir: "sc",
    label: "SYN-ACK  seq=300 ack=101",
    color: "var(--neon-magenta)",
    client: "SYN-SENT",
    server: "SYN-RCVD",
    note: "2 — Server replies SYN-ACK: its own seq (300), and acknowledges 101.",
  },
  {
    dir: "cs",
    label: "ACK  ack=301",
    color: "var(--neon-lime)",
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "3 — Client acknowledges 301. Both ends agree; the connection is open.",
  },
  {
    dir: "cs",
    label: 'DATA  "GET /"',
    color: "var(--neon-cyan)",
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Established — now bytes flow as one ordered stream.",
  },
];

function TcpHandshakeWidget() {
  const [step, setStep] = useState(0);
  const cur = TCP_STEPS[step];
  const clientX = 95;
  const serverX = 385;
  const msgY = 205;
  const hasMsg = step > 0;
  const fromX = cur.dir === "cs" ? clientX : serverX;
  const toX = cur.dir === "cs" ? serverX : clientX;
  const established = step >= 3;

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// TCP three-way handshake"}</span>
        <div className="widget-controls">
          <button
            type="button"
            className="widget-btn"
            onClick={() => setStep((s) => Math.min(TCP_STEPS.length - 1, s + 1))}
            disabled={step >= TCP_STEPS.length - 1}
          >
            step →
          </button>
          <button type="button" className="widget-btn" onClick={() => setStep(0)}>
            reset
          </button>
        </div>
      </div>

      <svg
        className="widget-canvas"
        viewBox="0 0 480 300"
        role="img"
        aria-label="A TCP three-way handshake between a client and a server, advanced step by step: SYN, then SYN-ACK, then ACK, then data."
      >
        {([
          { x: clientX, label: "CLIENT", state: cur.client },
          { x: serverX, label: "SERVER", state: cur.server },
        ] as const).map((ep) => (
          <g key={ep.label}>
            <rect
              x={ep.x - 60}
              y={26}
              width={120}
              height={48}
              rx={8}
              fill="var(--bg-2)"
              stroke={established ? "var(--neon-lime)" : "var(--fg-mute)"}
              strokeWidth="2"
            />
            <text x={ep.x} y={46} textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-mono)" fontSize="13" fontWeight="600">
              {ep.label}
            </text>
            <text
              x={ep.x}
              y={64}
              textAnchor="middle"
              fill={established ? "var(--neon-lime)" : "var(--fg-mute)"}
              fontFamily="var(--font-mono)"
              fontSize="11"
            >
              {ep.state}
            </text>
            <line x1={ep.x} y1={74} x2={ep.x} y2={282} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="2 4" />
          </g>
        ))}

        {hasMsg && (
          <g key={step}>
            <text x={240} y={msgY - 16} textAnchor="middle" fill={cur.color} fontFamily="var(--font-mono)" fontSize="12" fontWeight="600">
              {cur.label}
            </text>
            <line x1={fromX} y1={msgY} x2={toX} y2={msgY} stroke={cur.color} strokeWidth="1.5" opacity={0.5} />
            <circle cx={toX} cy={msgY} r="4" fill={cur.color} />
            <circle r="7" cy={msgY} fill={cur.color} className="widget-message">
              <animate attributeName="cx" from={fromX} to={toX} dur="0.7s" fill="freeze" />
            </circle>
          </g>
        )}
      </svg>

      <p className="widget-caption" style={{ color: cur.color }}>
        {cur.note}
      </p>
      <p className="widget-caption">
        the kernel runs all of this before <code>connect()</code> ever returns: three messages to agree on sequence numbers and confirm both ends can hear each other. closing repeats the shape in reverse with FIN/ACK.
      </p>
    </div>
  );
}

/* =====================================================================
   Node at three scales: the same pattern from heap to blockchain
   ===================================================================== */
type NodeScale = "struct" | "network" | "chain";

const NODE_SCALES: Record<
  NodeScale,
  {
    btn: string;
    title: string;
    color: string;
    identity: string;
    state: string;
    neighbours: string;
    center: string;
    peer: string;
    caption: string;
  }
> = {
  struct: {
    btn: "data structure",
    title: "linked-list node",
    color: "var(--neon-cyan)",
    identity: "a heap pointer",
    state: "value: 42",
    neighbours: "next → 1 node",
    center: "{ 42, next }",
    peer: "node",
    caption: "~16 bytes on the heap. Addressed by a pointer, holds a value, points at its neighbour.",
  },
  network: {
    btn: "network",
    title: "network node",
    color: "var(--neon-indigo)",
    identity: "IP 192.168.1.42",
    state: "OS + sockets",
    neighbours: "TCP peers",
    center: "a computer",
    peer: "host",
    caption: "A whole computer. Addressed by an IP address, runs an OS, connected to peers over TCP.",
  },
  chain: {
    btn: "blockchain",
    title: "blockchain node",
    color: "var(--neon-amber)",
    identity: "a public-key hash",
    state: "full chain copy",
    neighbours: "~125 gossip peers",
    center: "node + chain",
    peer: "peer",
    caption: "A computer running protocol software. Holds a full copy of the chain, gossips with ~125 peers.",
  },
};

function NodeScalesWidget() {
  const [scale, setScale] = useState<NodeScale>("struct");
  const d = NODE_SCALES[scale];
  const cx = 240;
  const cy = 95;
  const peers = [
    { x: 80, y: 70 },
    { x: 400, y: 70 },
    { x: 240, y: 170 },
  ];

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// one word, three scales"}</span>
        <div className="widget-controls">
          {(Object.keys(NODE_SCALES) as NodeScale[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`widget-btn ${scale === s ? "is-active" : ""}`}
              onClick={() => setScale(s)}
            >
              {NODE_SCALES[s].btn}
            </button>
          ))}
        </div>
      </div>

      <svg
        className="widget-canvas"
        viewBox="0 0 480 320"
        role="img"
        aria-label="A node and its neighbours at the selected scale, with its identity, state, and neighbours labelled."
      >
        {peers.map((p, i) => (
          <line key={`e-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={d.color} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.55} />
        ))}
        {peers.map((p, i) => (
          <g key={`p-${i}`}>
            <circle cx={p.x} cy={p.y} r={20} fill="var(--bg-2)" stroke="var(--fg-mute)" strokeWidth="1.5" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fill="var(--fg-mute)" fontFamily="var(--font-mono)" fontSize="10">
              {d.peer}
            </text>
          </g>
        ))}

        <rect x={cx - 78} y={cy - 30} width={156} height={60} rx={10} fill="var(--bg-2)" stroke={d.color} strokeWidth="2.5" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={d.color} fontFamily="var(--font-mono)" fontSize="13" fontWeight="600">
          {d.title}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-mono)" fontSize="12">
          {d.center}
        </text>

        <line x1={30} y1={218} x2={450} y2={218} stroke="var(--line-strong)" strokeWidth="1" />
        {([
          { label: "identity", value: d.identity, x: 95 },
          { label: "state", value: d.state, x: 240 },
          { label: "neighbours", value: d.neighbours, x: 385 },
        ] as const).map((col) => (
          <g key={col.label}>
            <text x={col.x} y={250} textAnchor="middle" fill={d.color} fontFamily="var(--font-mono)" fontSize="11" fontWeight="600">
              {col.label}
            </text>
            <text x={col.x} y={273} textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-mono)" fontSize="11">
              {col.value}
            </text>
          </g>
        ))}
      </svg>

      <p className="widget-caption">
        <strong style={{ color: d.color }}>{d.title}</strong>: {d.caption} Same three properties every time — <strong>identity</strong>, <strong>state</strong>, <strong>neighbours</strong> — at wildly different scales.
      </p>
    </div>
  );
}

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
    case "memory-layout":
      return <MemoryLayoutWidget />;
    case "pointer-visualiser":
      return <PointerVisualiserWidget />;
    case "phase-classifier":
      return <PhaseClassifierWidget />;
    case "array-explorer":
      return <ArrayExplorerWidget />;
    case "linked-list-visualiser":
      return <LinkedListVisualiserWidget />;
    case "big-o-race":
      return <BigORaceWidget />;
    case "process-scheduler":
      return <ProcessSchedulerWidget />;
    case "sorting-race":
      return <SortingRaceWidget />;
    case "hash-visualiser":
      return <HashVisualiserWidget />;
    case "search-race":
      return <SearchRaceWidget />;
    case "tcp-handshake-sim":
      return <TcpHandshakeWidget />;
    case "node-scales":
      return <NodeScalesWidget />;
    default:
      return null;
  }
}
