"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
        <span className="widget-title">{"// CAP theorem — pick any two"}</span>
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
        partition the network, then write on either side — values diverge. heal the partition and the system reconciles (here: highest value wins; real CRDTs use more sophisticated merge rules).
      </p>
    </div>
  );
}

/* =====================================================================
   4. Base converter: type any number, see it in all four bases instantly.
      Bit squares are clickable — toggle a bit and every display updates.
   ===================================================================== */
function BaseConverterWidget() {
  const [inputText, setInputText] = useState("173");
  const [value, setValue] = useState(173);
  const [isValid, setIsValid] = useState(true);

  function parse(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    let n: number;
    if (/^0[xX][0-9a-fA-F]+$/.test(t))      n = parseInt(t, 16);
    else if (/^0[bB][01]+$/.test(t))          n = parseInt(t.slice(2), 2);
    else if (/^0[oO][0-7]+$/.test(t))         n = parseInt(t.slice(2), 8);
    else if (/^[0-9]+$/.test(t))              n = parseInt(t, 10);
    else return null;
    return n >= 0 && n <= 0xffffffff ? n : null;
  }

  function handleInput(s: string) {
    setInputText(s);
    const n = parse(s);
    if (n !== null) { setValue(n); setIsValid(true); }
    else setIsValid(false);
  }

  function quickSet(raw: string, n: number) {
    setInputText(raw);
    setValue(n);
    setIsValid(true);
  }

  const bitWidth = value > 0xffff ? 32 : value > 0xff ? 16 : 8;
  const bits = Array.from({ length: bitWidth }, (_, i) =>
    (value >>> (bitWidth - 1 - i)) & 1,
  );

  function toggleBit(i: number) {
    const pos = bitWidth - 1 - i;
    const newVal = (value ^ (pos === 31 ? 0x80000000 : 1 << pos)) >>> 0;
    setValue(newVal);
    setInputText(String(newVal));
    setIsValid(true);
  }

  const setBits = bits
    .map((b, i) => ({ b, pos: bitWidth - 1 - i, contrib: b * 2 ** (bitWidth - 1 - i) }))
    .filter((x) => x.b === 1);

  const QUICK = [
    { label: "255",        raw: "255",        n: 255 },
    { label: "72 (H)",     raw: "72",         n: 72 },
    { label: "0xDEADBEEF", raw: "0xDEADBEEF", n: 0xdeadbeef },
    { label: "65535",      raw: "65535",      n: 65535 },
  ];

  // Build bit display with nibble separators between groups of 4
  const bitElements: React.ReactNode[] = [];
  bits.forEach((b, i) => {
    if (i > 0 && (bitWidth - i) % 4 === 0) {
      bitElements.push(
        <span key={`sep-${i}`} className="bc-nibble-sep" aria-hidden="true" />,
      );
    }
    bitElements.push(
      <button
        key={i}
        type="button"
        className={`bc-bit${b ? " is-on" : " is-off"}`}
        onClick={() => toggleBit(i)}
        aria-label={`bit ${bitWidth - 1 - i} is ${b}, click to toggle`}
        title={`2^${bitWidth - 1 - i} = ${(2 ** (bitWidth - 1 - i)).toLocaleString()}`}
      >
        {b}
      </button>,
    );
  });

  return (
    <div className="widget-wrap">
      <div className="widget-head">
        <span className="widget-title">{"// base converter"}</span>
        <div className="widget-controls">
          {QUICK.map((q) => (
            <button
              key={q.n}
              type="button"
              className="widget-btn"
              onClick={() => quickSet(q.raw, q.n)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bc-input-wrap">
        <input
          className={`bc-input${isValid ? "" : " is-error"}`}
          value={inputText}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="type a number: 255, 0xFF, 0b11111111, 0o377"
          spellCheck={false}
          aria-label="number input — accepts decimal, 0x hex, 0b binary, 0o octal"
        />
      </div>

      <div className="bc-outputs">
        {[
          { label: "decimal", val: isValid ? value.toLocaleString()               : "—", cls: "" },
          { label: "hex",     val: isValid ? "0x" + value.toString(16).toUpperCase() : "—", cls: " is-cyan" },
          { label: "octal",   val: isValid ? "0o" + value.toString(8)             : "—", cls: " is-amber" },
          { label: "binary",  val: isValid ? "0b" + value.toString(2)             : "—", cls: " is-violet" },
        ].map((o) => (
          <div key={o.label} className="bc-output">
            <span className="bc-output-label">{o.label}</span>
            <span className={`bc-output-value${o.cls}`}>{o.val}</span>
          </div>
        ))}
      </div>

      {isValid && (
        <>
          <div
            className="bc-bits"
            role="group"
            aria-label={`${bitWidth}-bit representation, click any bit to toggle`}
          >
            {bitElements}
          </div>

          {setBits.length > 0 ? (
            <p className="bc-breakdown">
              {setBits.map((x, i) => (
                <span key={i}>
                  {i > 0 && <span className="bc-op"> + </span>}
                  <span className="bc-term">
                    2<sup>{x.pos}</sup>
                  </span>
                  <span className="bc-contrib">({x.contrib.toLocaleString()})</span>
                </span>
              ))}
              <span className="bc-result"> = {value.toLocaleString()}</span>
            </p>
          ) : (
            <p className="bc-breakdown">
              <span className="bc-term">0</span>
              <span className="bc-result"> = 0</span>
            </p>
          )}
        </>
      )}

      <p className="widget-caption">
        click any bit to toggle it — all four displays update instantly. accepts decimal,{" "}
        <code>0x</code>hex, <code>0b</code>binary, <code>0o</code>octal. max 32 bits (4,294,967,295).
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
    case "base-converter":
      return <BaseConverterWidget />;
    default:
      return null;
  }
}
