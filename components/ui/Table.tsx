'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  width?: number; // Optional width in pixels
  minWidth?: number; // Minimum width when resizing
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  resizable?: boolean; // Enable column resizing
  columnWidths?: Record<string, number>; // Controlled column widths
  onColumnWidthChange?: (columnKey: string, width: number) => void; // Callback for width changes
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  resizable = false,
  columnWidths = {},
  onColumnWidthChange,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleResizeStart = (e: React.MouseEvent, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(currentWidth);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizingColumn) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(startWidth + diff, 100); // Minimum width of 100px
        onColumnWidthChange?.(resizingColumn, newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizingColumn(null);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizingColumn, startX, startWidth, onColumnWidthChange]);

  const sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const getColumnWidth = (column: Column<T>) => {
    return columnWidths[column.key] || column.width || 150;
  };

  return (
    <div className="overflow-x-auto">
      <table ref={tableRef} className="min-w-full divide-y divide-gray-200" style={{ tableLayout: resizable ? 'fixed' : 'auto' }}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => {
              const width = getColumnWidth(column);
              return (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={resizable ? { width: `${width}px`, minWidth: column.minWidth || 100 } : undefined}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      {column.header}
                      {sortKey === column.key && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}

                  {/* Resize Handle */}
                  {resizable && index < columns.length - 1 && (
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                      style={{
                        backgroundColor: resizingColumn === column.key ? '#3B82F6' : 'transparent',
                      }}
                      onMouseDown={(e) => handleResizeStart(e, column.key, width)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  className="px-6 py-4 text-sm text-gray-900"
                  style={resizable ? {
                    width: `${getColumnWidth(column)}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  } : { whiteSpace: 'nowrap' }}
                >
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
