'use client';

import { useState } from 'react';
import { Employee } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const { attributes } = useCustomAttributes();
  const [formData, setFormData] = useState({
    type: employee?.type || 'employee',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    department: employee?.department || '',
    title: employee?.title || '',
    manager: employee?.manager || '',
    status: employee?.status || 'active',
    startDate: employee?.startDate || '',
    endDate: employee?.endDate || '',
    customAttributes: employee?.customAttributes || {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.manager.trim()) newErrors.manager = 'Manager is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    if (formData.type === 'contractor' && !formData.endDate) {
      newErrors.endDate = 'End date is required for contractors';
    }

    if (formData.endDate && formData.startDate) {
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Validate custom attributes
    attributes.forEach(attr => {
      if (attr.required && !formData.customAttributes[attr.name]) {
        newErrors[`custom_${attr.id}`] = `${attr.name} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomAttributeChange = (attrName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customAttributes: { ...prev.customAttributes, [attrName]: value }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Type"
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value)}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'contractor', label: 'Contractor' },
          ]}
          required
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'terminated', label: 'Terminated' },
          ]}
          required
        />

        <Input
          label="First Name"
          value={formData.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          error={errors.firstName}
          required
        />

        <Input
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          error={errors.lastName}
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          required
        />

        <Input
          label="Department"
          value={formData.department}
          onChange={(e) => handleChange('department', e.target.value)}
          error={errors.department}
          required
        />

        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          required
        />

        <Input
          label="Manager"
          value={formData.manager}
          onChange={(e) => handleChange('manager', e.target.value)}
          error={errors.manager}
          required
        />

        <Input
          label="Start Date"
          type="date"
          value={formData.startDate}
          onChange={(e) => handleChange('startDate', e.target.value)}
          error={errors.startDate}
          required
        />

        {formData.type === 'contractor' && (
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            error={errors.endDate}
            required
          />
        )}
      </div>

      {/* Custom Attributes */}
      {attributes.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Custom Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.map(attr => {
              const value = formData.customAttributes[attr.name] || '';
              const error = errors[`custom_${attr.id}`];

              if (attr.dataType === 'boolean') {
                return (
                  <div key={attr.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={attr.id}
                      checked={!!value}
                      onChange={(e) => handleCustomAttributeChange(attr.name, e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor={attr.id} className="text-sm font-medium text-gray-700">
                      {attr.name}
                      {attr.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                );
              }

              if (attr.dataType === 'select' && attr.options) {
                return (
                  <Select
                    key={attr.id}
                    label={attr.name}
                    value={value as string || ''}
                    onChange={(e) => handleCustomAttributeChange(attr.name, e.target.value)}
                    options={[
                      { value: '', label: '-- Select --' },
                      ...attr.options.map(opt => ({ value: opt, label: opt })),
                    ]}
                    error={error}
                    required={attr.required}
                  />
                );
              }

              return (
                <Input
                  key={attr.id}
                  label={attr.name}
                  type={attr.dataType === 'number' || attr.dataType === 'currency' ? 'number' : attr.dataType === 'date' ? 'date' : 'text'}
                  value={typeof value === 'boolean' ? String(value) : value}
                  onChange={(e) => handleCustomAttributeChange(attr.name, e.target.value)}
                  error={error}
                  required={attr.required}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {employee ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
