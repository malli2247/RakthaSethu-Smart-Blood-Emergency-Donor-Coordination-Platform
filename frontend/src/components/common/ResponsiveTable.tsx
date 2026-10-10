import React from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  mobileHidden?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  renderMobileCard,
  emptyState,
  isLoading,
  className = '',
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
        <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading records...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState || <div className="p-8 text-center text-xs text-slate-400">No records found</div>}</>;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Card / List View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          if (renderMobileCard) {
            return <div key={key}>{renderMobileCard(item, index)}</div>;
          }

          // Default smart card if custom renderer is not provided
          return (
            <div
              key={key}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs"
            >
              {columns.map((col, cIdx) => {
                const val = typeof col.accessor === 'function'
                  ? col.accessor(item)
                  : col.accessor
                  ? (item[col.accessor] as React.ReactNode)
                  : null;

                return (
                  <div key={cIdx} className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-100 last:border-b-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {col.header}
                    </span>
                    <span className="font-medium text-slate-900 text-right">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet Table (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((item, rowIdx) => (
              <tr key={keyExtractor(item, rowIdx)} className="hover:bg-slate-50/80 transition-colors">
                {columns.map((col, colIdx) => {
                  const val = typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : col.accessor
                    ? (item[col.accessor] as React.ReactNode)
                    : null;

                  return (
                    <td key={colIdx} className={`px-4 py-3 text-slate-700 ${col.className || ''}`}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
