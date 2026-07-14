import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  emptyText: string;
}

export function DataTable<T>({ columns, rows, emptyText }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="empty-text">{emptyText}</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.header}>{col.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
