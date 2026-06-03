'use client';

import { useState, useRef } from 'react';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { useLogo } from '@/hooks/useLogo';
import { CustomAttribute } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { Plus, Edit, Trash2, Upload, X, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { attributes, createAttribute, updateAttribute, deleteAttribute } = useCustomAttributes();
  const { logo, uploadLogo, removeLogo } = useLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<CustomAttribute | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dataType: 'string' as CustomAttribute['dataType'],
    required: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError('');
    setLogoUploading(true);

    try {
      await uploadLogo(file);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoRemove = () => {
    if (confirm('Are you sure you want to remove the logo?')) {
      removeLogo();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dataType: 'string',
      required: false,
    });
    setErrors({});
    setEditingAttribute(null);
  };

  const openModal = (attribute?: CustomAttribute) => {
    if (attribute) {
      setEditingAttribute(attribute);
      setFormData({
        name: attribute.name,
        dataType: attribute.dataType,
        required: attribute.required,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingAttribute) {
      updateAttribute(editingAttribute.id, formData);
    } else {
      createAttribute(formData);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this custom attribute?')) {
      deleteAttribute(id);
    }
  };

  const columns: Column<CustomAttribute>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'dataType',
      header: 'Data Type',
      sortable: true,
      render: (attr) => (
        <span className="capitalize">{attr.dataType}</span>
      ),
    },
    {
      key: 'required',
      header: 'Required',
      sortable: true,
      render: (attr) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={attr.required}
            onChange={(e) => {
              e.stopPropagation();
              updateAttribute(attr.id, { required: e.target.checked });
            }}
            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
            title={attr.required ? 'Mark as optional' : 'Mark as required'}
          />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            attr.required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {attr.required ? 'Yes' : 'No'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (attr) => (
        <div className="flex gap-2">
          <button
            onClick={() => openModal(attr)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => handleDelete(attr.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ];

  // Core attributes that come with every employee
  const coreAttributes = [
    { name: 'Type', dataType: 'Employee or Contractor', required: true },
    { name: 'First Name', dataType: 'Text', required: true },
    { name: 'Last Name', dataType: 'Text', required: true },
    { name: 'Email', dataType: 'Text', required: true },
    { name: 'Department', dataType: 'Text', required: true },
    { name: 'Title', dataType: 'Text', required: true },
    { name: 'Manager', dataType: 'Text', required: true },
    { name: 'Status', dataType: 'Active, Inactive, or Terminated', required: true },
    { name: 'Start Date', dataType: 'Date', required: true },
    { name: 'End Date', dataType: 'Date', required: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage company logo and custom attributes</p>
        </div>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus size={18} className="mr-2" />
          Add Attribute
        </Button>
      </div>

      {/* Company Logo Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Company Logo</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload your company logo to display in the navigation bar. Maximum file size: 2MB.
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {logo ? (
                <div className="relative">
                  <img
                    src={logo}
                    alt="Company Logo"
                    className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg p-2"
                  />
                  <button
                    onClick={handleLogoRemove}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 border-dashed">
                  <Building2 size={32} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary px-4 py-2 text-base">
                  <Upload size={18} className="mr-2" />
                  {logoUploading ? 'Uploading...' : logo ? 'Change Logo' : 'Upload Logo'}
                </span>
              </label>
              {logoError && (
                <p className="text-sm text-red-600 mt-2">{logoError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Recommended: Square image (PNG, JPG, or SVG) at least 200x200 pixels
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Attributes Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Core Attributes</h2>
          <p className="text-sm text-gray-600 mt-1">
            These attributes are included with every employee record and cannot be modified.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coreAttributes.map((attr, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attr.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {attr.dataType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attr.required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {attr.required ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Attributes Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Custom Attributes</h2>
          <p className="text-sm text-gray-600 mt-1">
            {attributes.length} custom attribute{attributes.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <Table
          data={attributes}
          columns={columns}
          emptyMessage="No custom attributes defined. Add your first attribute to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAttribute ? 'Edit Custom Attribute' : 'Add Custom Attribute'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingAttribute ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Attribute Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., Salary, Hire Date, Remote"
            required
          />

          <Select
            label="Data Type"
            value={formData.dataType}
            onChange={(e) => setFormData({ ...formData, dataType: e.target.value as CustomAttribute['dataType'] })}
            options={[
              { value: 'string', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'date', label: 'Date' },
              { value: 'boolean', label: 'Yes/No' },
              { value: 'currency', label: 'Currency' },
            ]}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="required" className="text-sm font-medium text-gray-700">
              Required field
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
