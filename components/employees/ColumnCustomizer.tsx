'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Column } from '@/components/ui/Table';
import { Employee } from '@/lib/types';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

interface ColumnCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: Column<Employee>[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export function ColumnCustomizer({
  isOpen,
  onClose,
  availableColumns,
  visibleColumns,
  onColumnToggle,
  onReorder,
  onReset,
}: ColumnCustomizerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const visibleColumnsList = availableColumns
    .filter(col => visibleColumns.includes(col.key))
    .sort((a, b) => visibleColumns.indexOf(a.key) - visibleColumns.indexOf(b.key));

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Columns"
      footer={
        <>
          <Button variant="ghost" onClick={onReset}>
            Reset to Default
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select which columns to display and drag to reorder them.
        </p>

        {/* Available Columns */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Available Columns</h3>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {availableColumns.map((column) => {
              const isVisible = visibleColumns.includes(column.key);
              const visibleIndex = visibleColumnsList.findIndex(col => col.key === column.key);
              const isDragging = draggedIndex === visibleIndex;

              return (
                <div
                  key={column.key}
                  className={`flex items-center gap-3 p-3 transition-colors ${
                    isVisible ? 'bg-white' : 'bg-gray-50'
                  } ${isDragging ? 'opacity-50' : ''}`}
                  draggable={isVisible}
                  onDragStart={(e) => isVisible && handleDragStart(e, visibleIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => isVisible && handleDrop(e, visibleIndex)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drag Handle */}
                  {isVisible && (
                    <div className="cursor-move text-gray-400 hover:text-gray-600">
                      <GripVertical size={18} />
                    </div>
                  )}

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onColumnToggle(column.key)}
                    disabled={column.key === 'actions'} // Actions column always visible
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />

                  {/* Column Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {column.header}
                      </span>
                      {column.key === 'actions' && (
                        <span className="text-xs text-gray-500">(Always visible)</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Field: {column.key}
                    </span>
                  </div>

                  {/* Visibility Icon */}
                  <div className="text-gray-400">
                    {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column Count */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{visibleColumns.length}</strong> of <strong>{availableColumns.length}</strong> columns visible
          </p>
        </div>
      </div>
    </Modal>
  );
}
