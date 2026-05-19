"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
        click any node — it broadcasts to its three peers; each of those forwards to theirs; within a few hops every node has the message. no coordinator, just forwarding.
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
    default:
      return null;
  }
}
