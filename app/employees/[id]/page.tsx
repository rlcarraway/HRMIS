'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useEmployees } from '@/hooks/useEmployees';
import { useCoreAttributes } from '@/hooks/useCoreAttributes';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { Employee } from '@/lib/types';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import { canManageEmployees } from '@/lib/authTypes';

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const { getEmployee, updateEmployee } = useEmployees();
  const { attributes: coreAttributesConfig } = useCoreAttributes();
  const { attributes: customAttributeDefs } = useCustomAttributes();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = canManageEmployees(session as any);

  useEffect(() => {
    const emp = getEmployee(params.id);
    setEmployee(emp);
  }, [params.id, getEmployee]);

  const handleSubmit = async (data: any) => {
    const updated = await updateEmployee(params.id, data);
    if (updated) {
      setEmployee(updated);
    }
    setIsEditing(false);
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/employees" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/employees/${params.id}/history`}>
            <Button variant="ghost">
              <History size={18} className="mr-2" />
              View History
            </Button>
          </Link>
          {!isEditing && isAdmin && (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Employee
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {isEditing ? (
          <EmployeeForm
            employee={employee}
            onSubmit={handleSubmit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coreAttributesConfig.map(config => {
                const fieldName = config.fieldName;
                if (fieldName === 'endDate' && employee.type !== 'contractor') return null;

                const rawValue = employee[fieldName as keyof Employee];
                if (rawValue === undefined || rawValue === null || rawValue === '') return null;

                const displayValue =
                  config.dataType === 'boolean' ? (rawValue ? 'Yes' : 'No') : String(rawValue);

                return (
                  <div key={fieldName}>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {config.displayName}
                    </label>
                    <p className={`text-base text-gray-900 ${config.dataType === 'select' ? 'capitalize' : ''}`}>
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Custom Attributes */}
            {customAttributeDefs.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Custom Attributes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customAttributeDefs.map(attr => {
                    const value = employee.customAttributes?.[attr.name];
                    const displayValue =
                      value === undefined || value === null || value === ''
                        ? '—'
                        : attr.dataType === 'boolean'
                          ? (value ? 'Yes' : 'No')
                          : String(value);

                    return (
                      <div key={attr.id}>
                        <label className="block text-sm font-medium text-gray-500 mb-1">{attr.name}</label>
                        <p className="text-base text-gray-900">{displayValue}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
