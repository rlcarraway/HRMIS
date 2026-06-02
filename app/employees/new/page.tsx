'use client';

import { useRouter } from 'next/navigation';
import { useEmployees } from '@/hooks/useEmployees';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const { createEmployee } = useEmployees();

  const handleSubmit = (data: any) => {
    createEmployee(data);
    router.push('/employees');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <EmployeeForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/employees')}
        />
      </div>
    </div>
  );
}
