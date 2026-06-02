import { format, parseISO, add, set, startOfMonth, addMonths } from 'date-fns';
import { Employee, EmployeeStats, ExportSchedule } from './types';

// Format date for display
export function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

// Generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Calculate employee statistics
export function calculateStats(employees: Employee[]): EmployeeStats {
  const stats: EmployeeStats = {
    total: employees.length,
    active: 0,
    inactive: 0,
    terminated: 0,
    employees: 0,
    contractors: 0,
    byDepartment: {},
  };

  employees.forEach(emp => {
    // Count by status
    if (emp.status === 'active') stats.active++;
    else if (emp.status === 'inactive') stats.inactive++;
    else if (emp.status === 'terminated') stats.terminated++;

    // Count by type
    if (emp.type === 'employee') stats.employees++;
    else if (emp.type === 'contractor') stats.contractors++;

    // Count by department
    if (emp.department) {
      stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;
    }
  });

  return stats;
}

// Deep comparison for change tracking
export function getObjectDiff(oldObj: any, newObj: any): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  // Check all keys in new object
  Object.keys(newObj).forEach(key => {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes[key] = { old: oldObj[key], new: newObj[key] };
    }
  });

  // Check for removed keys
  Object.keys(oldObj).forEach(key => {
    if (!(key in newObj)) {
      changes[key] = { old: oldObj[key], new: undefined };
    }
  });

  return changes;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Class name utility (simple version)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Calculate next execution time based on schedule
export function calculateNextScheduledTime(schedule: ExportSchedule): string {
  const now = new Date();

  switch (schedule.frequency) {
    case 'minutes': {
      // Add interval minutes to now
      const nextMinutes = add(now, { minutes: schedule.intervalValue! });
      return nextMinutes.toISOString();
    }

    case 'hourly': {
      // Add interval hours to now
      const nextHours = add(now, { hours: schedule.intervalValue! });
      return nextHours.toISOString();
    }

    case 'once':
      return schedule.scheduledDate!; // Already validated

    case 'daily': {
      const [hours, minutes] = schedule.scheduledTime!.split(':').map(Number);
      let nextDaily = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
      if (nextDaily <= now) {
        nextDaily = add(nextDaily, { days: 1 });
      }
      return nextDaily.toISOString();
    }

    case 'weekly': {
      const [hours, minutes] = schedule.scheduledTime!.split(':').map(Number);
      // Find next occurrence of dayOfWeek
      let nextWeekly = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
      const currentDay = nextWeekly.getDay();
      const targetDay = schedule.dayOfWeek!;

      if (currentDay < targetDay || (currentDay === targetDay && nextWeekly > now)) {
        // Target day is later this week
        nextWeekly = add(nextWeekly, { days: targetDay - currentDay });
      } else {
        // Target day is next week
        nextWeekly = add(nextWeekly, { days: 7 - (currentDay - targetDay) });
      }
      return nextWeekly.toISOString();
    }

    case 'monthly': {
      const [hours, minutes] = schedule.scheduledTime!.split(':').map(Number);
      // Next occurrence of dayOfMonth
      let nextMonthly = set(startOfMonth(now), {
        date: schedule.dayOfMonth!,
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0
      });
      if (nextMonthly <= now) {
        nextMonthly = set(addMonths(startOfMonth(nextMonthly), 1), {
          date: schedule.dayOfMonth!,
          hours,
          minutes,
          seconds: 0,
          milliseconds: 0
        });
      }
      return nextMonthly.toISOString();
    }
  }
}

// Check if schedule is due for execution
export function isScheduleDue(schedule: ExportSchedule): boolean {
  const now = new Date();
  const next = parseISO(schedule.nextScheduled);
  return schedule.enabled && next <= now;
}
