'use client';

import { useEmployees } from '@/hooks/useEmployees';
import { useHistory } from '@/hooks/useHistory';
import { useExportSchedules } from '@/hooks/useExportSchedules';
import { calculateStats } from '@/lib/utils';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentChanges } from '@/components/dashboard/RecentChanges';
import { ExportMetadataCard } from '@/components/dashboard/ExportMetadataCard';
import { Users, UserCheck, UserX, AlertCircle, Briefcase, UserCog } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { employees, loading } = useEmployees();
  const { history } = useHistory();
  const { metadata } = useExportSchedules();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const stats = calculateStats(employees);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/employees/new">
            <Button variant="primary">Add New Employee</Button>
          </Link>
          <Link href="/employees">
            <Button variant="secondary">View All Employees</Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.total}
          icon={Users}
          color="blue"
          href="/employees"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={UserCheck}
          color="green"
          href="/employees?status=active"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={UserX}
          color="amber"
          href="/employees?status=inactive"
        />
        <StatCard
          title="Terminated"
          value={stats.terminated}
          icon={AlertCircle}
          color="red"
          href="/employees?status=terminated"
        />
        <StatCard
          title="Employees"
          value={stats.employees}
          icon={UserCog}
          color="blue"
          href="/employees?type=employee"
        />
        <StatCard
          title="Contractors"
          value={stats.contractors}
          icon={Briefcase}
          color="purple"
          href="/employees?type=contractor"
        />
      </div>

      {/* Department Breakdown */}
      {Object.keys(stats.byDepartment).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">By Department</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byDepartment).map(([dept, count]) => (
              <Link key={dept} href={`/employees?department=${encodeURIComponent(dept)}`}>
                <div className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer">
                  <p className="text-2xl font-bold text-primary">{count}</p>
                  <p className="text-sm text-gray-600 mt-1">{dept}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Export Metadata */}
      <ExportMetadataCard metadata={metadata} />

      {/* Recent Changes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Changes</h2>
          {history.length > 0 && (
            <Link href="/employees" className="text-sm text-primary hover:underline">
              View All
            </Link>
          )}
        </div>
        <RecentChanges history={history} limit={5} />
      </div>
    </div>
  );
}
