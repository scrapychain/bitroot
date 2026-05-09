"use client";

import { useMemo, useState } from "react";

interface Cell {
  code: number;
  display: string;
  hex: string;
  bin: string;
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (let i = 32; i <= 126; i++) {
    const ch = i === 32 ? "␣" : String.fromCharCode(i);
    cells.push({
      code: i,
      display: ch,
      hex: i.toString(16).toUpperCase().padStart(2, "0"),
      bin: i.toString(2).padStart(8, "0"),
    });
  }
  return cells;
}

export function AsciiGrid() {
  const cells = useMemo(buildCells, []);
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="ascii-grid" role="list">
      {cells.map((c) => {
        const isActive = active === c.code;
        return (
          <button
            type="button"
            key={c.code}
            className="ascii-cell"
            onClick={() => setActive(isActive ? null : c.code)}
            onMouseLeave={() => isActive && setActive(null)}
            aria-expanded={isActive}
            aria-label={`character ${c.display === "␣" ? "space" : c.display}, decimal ${c.code}`}
          >
            <span className="ascii-char">{c.display}</span>
            <span className="ascii-num">{c.code}</span>
            {isActive && (
              <span className="ascii-popover" role="tooltip">
                dec <strong>{c.code}</strong> &nbsp; hex <strong>0x{c.hex}</strong>
                <br />
                bin <strong>{c.bin}</strong>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
