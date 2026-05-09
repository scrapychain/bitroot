interface TruthTableProps {
  headers: string[];
  /** Row cells may contain HTML (for <code>, <sup>, etc.) */
  rows: string[][];
}

export function TruthTable({ headers, rows }: TruthTableProps) {
  return (
    <div className="table-scroll" role="region" aria-label="Table" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} dangerouslySetInnerHTML={{ __html: h }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
