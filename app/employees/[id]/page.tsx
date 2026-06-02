'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployees } from '@/hooks/useEmployees';
import { Employee } from '@/lib/types';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getEmployee, updateEmployee } = useEmployees();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const emp = getEmployee(params.id);
    setEmployee(emp);
  }, [params.id, getEmployee]);

  const handleSubmit = (data: any) => {
    updateEmployee(params.id, data);
    setIsEditing(false);
    const updatedEmp = getEmployee(params.id);
    setEmployee(updatedEmp);
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
          {!isEditing && (
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
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
                <p className="text-base text-gray-900 capitalize">{employee.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <p className="text-base text-gray-900 capitalize">{employee.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-base text-gray-900">{employee.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                <p className="text-base text-gray-900">{employee.department}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
                <p className="text-base text-gray-900">{employee.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Manager</label>
                <p className="text-base text-gray-900">{employee.manager}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                <p className="text-base text-gray-900">{employee.startDate}</p>
              </div>
              {employee.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                  <p className="text-base text-gray-900">{employee.endDate}</p>
                </div>
              )}
            </div>

            {/* Custom Attributes */}
            {Object.keys(employee.customAttributes || {}).length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Custom Attributes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(employee.customAttributes).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-500 mb-1">{key}</label>
                      <p className="text-base text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
