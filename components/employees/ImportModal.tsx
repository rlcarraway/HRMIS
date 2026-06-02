'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CustomAttribute, Employee } from '@/lib/types';
import { importEmployeesFromCSV, ValidationError } from '@/lib/import';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customAttributes: CustomAttribute[];
  onImport: (employees: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) => void;
}

export function ImportModal({ isOpen, onClose, customAttributes, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validRows, setValidRows] = useState<Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setValidRows([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvString = event.target?.result as string;
      const result = importEmployeesFromCSV(csvString, customAttributes);
      setValidRows(result.successful);
      setErrors(result.errors);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (validRows.length === 0 || errors.length > 0) return;

    setImporting(true);
    try {
      onImport(validRows);
      // Reset and close
      handleReset();
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidRows([]);
    setErrors([]);
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Employees from CSV"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!file || validRows.length === 0 || errors.length > 0 || importing}
          >
            {importing ? 'Importing...' : `Import ${validRows.length} Employee${validRows.length !== 1 ? 's' : ''}`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* File Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {file && (
              <Button variant="ghost" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Upload a CSV file with employee data. The file must include required columns: Type, First Name, Last Name, Email, Department, Title, Manager, Status, Start Date.
          </p>
        </div>

        {/* Preview Section */}
        {file && (
          <div className="space-y-4">
            {/* Summary Badges */}
            <div className="flex items-center gap-3">
              {validRows.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <CheckCircle size={16} />
                  <span>{validRows.length} valid row{validRows.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              {errors.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  <AlertCircle size={16} />
                  <span>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Error Details */}
            {errors.length > 0 && (
              <div className="border border-red-200 rounded-lg">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <AlertCircle size={18} />
                    <span>Validation Errors</span>
                  </div>
                  <span className="text-red-600 text-sm">
                    {showErrors ? 'Hide' : 'Show'} Details
                  </span>
                </button>

                {showErrors && (
                  <div className="border-t border-red-200 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-red-900">Row</th>
                          <th className="text-left px-4 py-2 font-medium text-red-900">Field</th>
                          <th className="text-left px-4 py-2 font-medium text-red-900">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {errors.map((error, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-4 py-2 text-red-700">{error.row}</td>
                            <td className="px-4 py-2 text-red-700 font-medium">{error.field}</td>
                            <td className="px-4 py-2 text-red-600">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {validRows.length > 0 && errors.length === 0 && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Ready to import {validRows.length} employee{validRows.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    All rows validated successfully. Click Import to add these employees to the system.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!file && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Upload size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>First row must contain column headers</li>
                  <li>Required columns: Type, First Name, Last Name, Email, Department, Title, Manager, Status, Start Date</li>
                  <li>End Date required for contractors</li>
                  <li>Custom attribute columns will be automatically detected</li>
                  <li>Dates should be in YYYY-MM-DD format</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
