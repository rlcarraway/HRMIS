'use client';

import { useState, useEffect, useCallback } from 'react';
import { Employee, EmployeeFilters } from '@/lib/types';
import { storage } from '@/lib/storage';
import { generateId, getObjectDiff } from '@/lib/utils';
import { useHistory } from './useHistory';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { addHistoryEntry } = useHistory();

  // Load employees from storage
  useEffect(() => {
    const loadEmployees = () => {
      const stored = storage.getEmployees();
      setEmployees(stored);
      setLoading(false);
    };
    loadEmployees();
  }, []);

  // Create new employee
  const createEmployee = useCallback((employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newEmployee: Employee = {
      ...employeeData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    storage.addEmployee(newEmployee);
    setEmployees(prev => [...prev, newEmployee]);

    // Add to history
    addHistoryEntry({
      employeeId: newEmployee.id,
      action: 'create',
      changes: {},
    });

    return newEmployee;
  }, [addHistoryEntry]);

  // Update employee
  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    const oldEmployee = employees.find(emp => emp.id === id);
    if (!oldEmployee) return null;

    const updatedEmployee = storage.updateEmployee(id, updates);
    if (updatedEmployee) {
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmployee : emp));

      // Track changes
      const changes = getObjectDiff(oldEmployee, updatedEmployee);
      if (Object.keys(changes).length > 0) {
        addHistoryEntry({
          employeeId: id,
          action: 'update',
          changes,
        });
      }
    }

    return updatedEmployee;
  }, [employees, addHistoryEntry]);

  // Delete employee
  const deleteEmployee = useCallback((id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return false;

    const success = storage.deleteEmployee(id);
    if (success) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));

      // Add to history
      addHistoryEntry({
        employeeId: id,
        action: 'delete',
        changes: {},
      });
    }

    return success;
  }, [employees, addHistoryEntry]);

  // Get single employee
  const getEmployee = useCallback((id: string) => {
    return employees.find(emp => emp.id === id) || null;
  }, [employees]);

  // Bulk create employees (for CSV import)
  const bulkCreateEmployees = useCallback((employeesData: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString();
    const newEmployees = employeesData.map(data => {
      const employee: Employee = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };

      // Add history entry for each employee
      addHistoryEntry({
        employeeId: employee.id,
        action: 'create',
        changes: {},
        changedBy: 'CSV Import',
      });

      return employee;
    });

    // Bulk update storage
    const currentEmployees = storage.getEmployees();
    storage.updateEmployees([...currentEmployees, ...newEmployees]);
    setEmployees(prev => [...prev, ...newEmployees]);

    return newEmployees;
  }, [addHistoryEntry]);

  // Filter employees
  const filterEmployees = useCallback((filters: EmployeeFilters) => {
    let filtered = [...employees];

    // Search filter (name or email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.firstName.toLowerCase().includes(searchLower) ||
        emp.lastName.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(emp => emp.status === filters.status);
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(emp => emp.type === filters.type);
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(emp => emp.department === filters.department);
    }

    // Date range filter
    if (filters.fromDate) {
      filtered = filtered.filter(emp => emp.startDate >= filters.fromDate!);
    }
    if (filters.toDate) {
      filtered = filtered.filter(emp => emp.startDate <= filters.toDate!);
    }

    return filtered;
  }, [employees]);

  return {
    employees,
    loading,
    createEmployee,
    bulkCreateEmployees,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    filterEmployees,
  };
}
