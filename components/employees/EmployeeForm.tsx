'use client';

import { useState, useMemo } from 'react';
import { Employee } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { useCoreAttributes } from '@/hooks/useCoreAttributes';
import { useEmployees } from '@/hooks/useEmployees';

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const { attributes } = useCustomAttributes();
  const { attributes: coreAttributesConfig } = useCoreAttributes();
  const { employees } = useEmployees();

  // Get list of active employees for manager dropdown
  const managerOptions = useMemo(() => {
    return employees
      .filter(emp => emp.status === 'active' && emp.id !== employee?.id) // Exclude current employee
      .map(emp => ({
        value: emp.email,
        label: `${emp.firstName} ${emp.lastName} (${emp.email})`
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees, employee?.id]);
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

  const renderCoreField = (config: any) => {
    const fieldName = config.fieldName;
    const value = formData[fieldName as keyof typeof formData] || '';
    const error = errors[fieldName];

    // Special handling for endDate - only show for contractors
    if (fieldName === 'endDate' && formData.type !== 'contractor') {
      return null;
    }

    // Special handling for manager - use dropdown of active employees or text input
    if (fieldName === 'manager') {
      // If no employees exist yet, show text input
      if (managerOptions.length === 0) {
        return (
          <div key={fieldName}>
            <Input
              label={config.displayName}
              type="email"
              value={value as string}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              error={error}
              required={config.required}
              placeholder="manager@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              No active employees found. Enter manager&apos;s email manually.
            </p>
          </div>
        );
      }

      // Otherwise show dropdown
      return (
        <div key={fieldName}>
          <Select
            label={config.displayName}
            value={value as string}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            options={[
              { value: '', label: '-- Select Manager --' },
              ...managerOptions
            ]}
            error={error}
            required={config.required}
          />
          <p className="mt-1 text-xs text-gray-500">
            Select from {managerOptions.length} active employee{managerOptions.length !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }

    if (config.dataType === 'boolean') {
      return (
        <div key={fieldName} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={fieldName}
            checked={!!value}
            onChange={(e) => handleChange(fieldName, e.target.checked)}
            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor={fieldName} className="text-sm font-medium text-gray-700">
            {config.displayName}
            {config.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
      );
    }

    if (config.dataType === 'select' && config.options) {
      return (
        <Select
          key={fieldName}
          label={config.displayName}
          value={value as string}
          onChange={(e) => handleChange(fieldName, e.target.value)}
          options={config.options.map((opt: string) => ({ value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) }))}
          error={error}
          required={config.required}
        />
      );
    }

    return (
      <Input
        key={fieldName}
        label={config.displayName}
        type={
          config.dataType === 'number' || config.dataType === 'currency' ? 'number' :
          config.dataType === 'date' ? 'date' :
          fieldName === 'email' ? 'email' : 'text'
        }
        value={typeof value === 'boolean' ? String(value) : value as string}
        onChange={(e) => handleChange(fieldName, e.target.value)}
        error={error}
        required={config.required}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coreAttributesConfig.map(config => renderCoreField(config))}
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
