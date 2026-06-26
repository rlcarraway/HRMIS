'use client';

import { useState, useEffect, useCallback } from 'react';
import { Employee, EmployeeFilters } from '@/lib/types';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Load employees from API
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      const result = await response.json();

      if (result.success && result.data) {
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create new employee
  const createEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setEmployees(prev => [...prev, result.data]);
        return result.data;
      } else {
        console.error('Failed to create employee:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      return null;
    }
  }, []);

  // Update employee
  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setEmployees(prev => prev.map(emp => emp.id === id ? result.data : emp));
        return result.data;
      } else {
        console.error('Failed to update employee:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      return null;
    }
  }, []);

  // Delete employee
  const deleteEmployee = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        return true;
      } else {
        console.error('Failed to delete employee:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }, []);

  // Get single employee
  const getEmployee = useCallback((id: string) => {
    return employees.find(emp => emp.id === id) || null;
  }, [employees]);

  // Bulk create employees (for CSV import)
  const bulkCreateEmployees = useCallback(async (employeesData: Array<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const createdEmployees: Employee[] = [];

    for (const data of employeesData) {
      const employee = await createEmployee(data);
      if (employee) {
        createdEmployees.push(employee);
      }
    }

    return createdEmployees;
  }, [createEmployee]);

  // Filter employees (client-side filtering)
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
    refreshEmployees: loadEmployees, // Add refresh method
  };
}
