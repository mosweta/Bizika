// src/features/lessons/renderer/blocks/TableBlock.jsx
import { RichTextSpan } from "./ParagraphBlock";

function renderCell(cell) {
  if (!Array.isArray(cell)) return cell;
  return cell.map((node, i) => <RichTextSpan key={i} node={node} />);
}

export function TableBlock({ headers = [], rows = [] }) {
  if (!headers.length && !rows.length) return null;

  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        {headers.length > 0 && (
          <thead className="bg-slate-50/60">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200"
                >
                  {renderCell(h)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr
              key={r}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
            >
              {row.map((cell, c) => (
                <td key={c} className="px-4 py-2.5 text-slate-700 align-top">
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}