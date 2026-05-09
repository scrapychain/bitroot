import { Fragment } from "react";

type GateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";

interface GateInfo {
  expr: string;
  rows: { a: 0 | 1; b?: 0 | 1; y: 0 | 1 }[];
  hasB: boolean;
  svg: React.ReactNode;
}

const AND_PATH = (
  <>
    <line className="wire" x1="0" y1="25" x2="30" y2="25" />
    <line className="wire" x1="0" y1="55" x2="30" y2="55" />
    <path className="body" d="M 30 15 L 60 15 A 25 25 0 0 1 60 65 L 30 65 Z" />
    <line className="wire" x1="85" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="20">A</text>
    <text className="label" x="5" y="50">B</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const OR_PATH = (
  <>
    <line className="wire" x1="0" y1="25" x2="35" y2="25" />
    <line className="wire" x1="0" y1="55" x2="35" y2="55" />
    <path className="body" d="M 25 15 Q 45 40 25 65 Q 60 65 85 40 Q 60 15 25 15 Z" />
    <line className="wire" x1="85" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="20">A</text>
    <text className="label" x="5" y="50">B</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const NOT_PATH = (
  <>
    <line className="wire" x1="0" y1="40" x2="30" y2="40" />
    <path className="body" d="M 30 18 L 30 62 L 75 40 Z" />
    <circle className="bubble" cx="82" cy="40" r="6" />
    <line className="wire" x1="88" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="35">A</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const XOR_PATH = (
  <>
    <line className="wire" x1="0" y1="25" x2="35" y2="25" />
    <line className="wire" x1="0" y1="55" x2="35" y2="55" />
    <path d="M 30 15 Q 50 40 30 65 Q 65 65 90 40 Q 65 15 30 15 Z" />
    <path d="M 22 15 Q 42 40 22 65" />
    <line className="wire" x1="90" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="20">A</text>
    <text className="label" x="5" y="50">B</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const NAND_PATH = (
  <>
    <line className="wire" x1="0" y1="25" x2="30" y2="25" />
    <line className="wire" x1="0" y1="55" x2="30" y2="55" />
    <path className="body" d="M 30 15 L 55 15 A 25 25 0 0 1 55 65 L 30 65 Z" />
    <circle className="bubble" cx="87" cy="40" r="6" />
    <line className="wire" x1="93" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="20">A</text>
    <text className="label" x="5" y="50">B</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const NOR_PATH = (
  <>
    <line className="wire" x1="0" y1="25" x2="35" y2="25" />
    <line className="wire" x1="0" y1="55" x2="35" y2="55" />
    <path className="body" d="M 25 15 Q 45 40 25 65 Q 55 65 80 40 Q 55 15 25 15 Z" />
    <circle className="bubble" cx="87" cy="40" r="6" />
    <line className="wire" x1="93" y1="40" x2="120" y2="40" />
    <text className="label" x="5" y="20">A</text>
    <text className="label" x="5" y="50">B</text>
    <text className="label" x="105" y="35">Y</text>
  </>
);

const GATES: Record<GateType, GateInfo> = {
  AND: {
    expr: "Y = A · B",
    hasB: true,
    rows: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 0, y: 0 },
      { a: 1, b: 1, y: 1 },
    ],
    svg: AND_PATH,
  },
  OR: {
    expr: "Y = A + B",
    hasB: true,
    rows: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 1 },
    ],
    svg: OR_PATH,
  },
  NOT: {
    expr: "Y = ¬A",
    hasB: false,
    rows: [
      { a: 0, y: 1 },
      { a: 1, y: 0 },
    ],
    svg: NOT_PATH,
  },
  XOR: {
    expr: "Y = A ⊕ B",
    hasB: true,
    rows: [
      { a: 0, b: 0, y: 0 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 0 },
    ],
    svg: XOR_PATH,
  },
  NAND: {
    expr: "Y = ¬(A · B)",
    hasB: true,
    rows: [
      { a: 0, b: 0, y: 1 },
      { a: 0, b: 1, y: 1 },
      { a: 1, b: 0, y: 1 },
      { a: 1, b: 1, y: 0 },
    ],
    svg: NAND_PATH,
  },
  NOR: {
    expr: "Y = ¬(A + B)",
    hasB: true,
    rows: [
      { a: 0, b: 0, y: 1 },
      { a: 0, b: 1, y: 0 },
      { a: 1, b: 0, y: 0 },
      { a: 1, b: 1, y: 0 },
    ],
    svg: NOR_PATH,
  },
};

const cls = (v: 0 | 1) => (v === 1 ? "hi" : "lo");

export function GateDiagram({ type }: { type: GateType }) {
  const g = GATES[type];

  return (
    <div className="gate">
      <svg className="gate-svg" viewBox="0 0 120 80">
        {g.svg}
      </svg>
      <div className="gate-name">{type}</div>
      <div className="gate-expr">{g.expr}</div>
      <div
        className="gate-mini-truth"
        style={!g.hasB ? { gridTemplateColumns: "repeat(2, 1fr)" } : undefined}
      >
        <span>A</span>
        {g.hasB && <span>B</span>}
        <span>Y</span>
        {g.rows.map((r, i) => (
          <Fragment key={i}>
            <span className={cls(r.a)}>{r.a}</span>
            {g.hasB && <span className={cls(r.b ?? 0)}>{r.b}</span>}
            <span className={cls(r.y)}>{r.y}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function GateGrid({ gates }: { gates: GateType[] }) {
  return (
    <div className="gate-grid">
      {gates.map((g) => (
        <GateDiagram key={g} type={g} />
      ))}
    </div>
  );
}
