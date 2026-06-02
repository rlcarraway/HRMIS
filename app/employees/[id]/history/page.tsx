'use client';

import { useEffect, useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useHistory } from '@/hooks/useHistory';
import { Employee } from '@/lib/types';
import { HistoryTimeline } from '@/components/employees/HistoryTimeline';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeHistoryPage({ params }: { params: { id: string } }) {
  const { getEmployee } = useEmployees();
  const { history } = useHistory(params.id);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const emp = getEmployee(params.id);
    setEmployee(emp);
  }, [params.id, getEmployee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/employees/${params.id}`} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Change History</h1>
          <p className="text-gray-600 mt-1">
            {employee.firstName} {employee.lastName}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <HistoryTimeline history={history} />
      </div>
    </div>
  );
}
