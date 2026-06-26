'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useCustomAttributes } from '@/hooks/useCustomAttributes';
import { useCoreAttributes } from '@/hooks/useCoreAttributes';
import { useLogo } from '@/hooks/useLogo';
import { useEmployees } from '@/hooks/useEmployees';
import { useSearchParams } from 'next/navigation';
import { CustomAttribute, CoreAttributeConfig } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { Plus, Edit, Trash2, Upload, X, Building2, ArrowUp, ArrowDown, Settings as SettingsIcon, Sliders, Webhook, Database, Users as UsersIcon, Send, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

type SettingsTab = 'system' | 'attributes' | 'outbound-api' | 'system-log' | 'inbound-api' | 'users';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface TestResult {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  error?: string;
  duration: number;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');
  const [oktaSettings, setOktaSettings] = useState({
    clientId: '',
    clientSecret: '',
    issuer: '',
  });
  const [oktaSaved, setOktaSaved] = useState(false);
  const [oktaLoading, setOktaLoading] = useState(false);
  const { attributes, createAttribute, updateAttribute, deleteAttribute } = useCustomAttributes();
  const { attributes: coreAttributes, updateAttribute: updateCoreAttribute, resetToDefaults } = useCoreAttributes();
  useEmployees();
  const { logo, uploadLogo, removeLogo } = useLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Test state
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/api/employees');
  const [authToken, setAuthToken] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEndpointDropdown, setShowEndpointDropdown] = useState(false);

  // Available inbound API endpoints
  const inboundEndpoints = [
    '/api/employees',
    '/api/employees/[id]',
    '/api/custom-attributes',
    '/api/custom-attributes/[id]',
    '/api/users',
    '/api/users/[id]',
    '/api/federated-users',
    '/api/federated-users/[id]',
    '/api/audit-logs',
    '/api/audit-logs/stats',
    '/api/export-schedules',
    '/api/export-schedules/[id]',
    '/api/export-schedules/[id]/execute',
    '/api/export-metadata',
    '/api/employee-operations',
    '/api/logo',
    '/api/user-type',
    '/api/okta-configured',
    '/api/okta-settings',
    '/api/outbound-api',
    '/api/test-webhook',
  ];


  // Users management state
  const [users, setUsers] = useState<any[]>([]);
  const [_editingUser, _setEditingUser] = useState<any | null>(null);
  const [_userModalOpen, _setUserModalOpen] = useState(false);

  // Outbound API state
  const [outboundApiSettings, setOutboundApiSettings] = useState({
    enabled: false,
    url: '',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    operations: {
      create: false,
      update: false,
      delete: false,
    },
  });
  const [outboundApiSaved, setOutboundApiSaved] = useState(false);
  const [outboundApiLoading, setOutboundApiLoading] = useState(false);
  const [outboundTestResult, setOutboundTestResult] = useState<any>(null);
  const [testingOperation, setTestingOperation] = useState<'create' | 'update' | 'delete' | null>(null);
  const defaultPayloadFormat = `{
  "profile": {
    "firstName": "Isaac",
    "lastName": "Brock",
    "email": "isaac.brock@example.com",
    "login": "isaac.brock@example.com",
    "mobilePhone": "555-415-1337"
  }
}`;
  const [payloadFormat, setPayloadFormat] = useState(defaultPayloadFormat);
  const [payloadValidationError, setPayloadValidationError] = useState<string>('');

  // System Log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogFromDate, setAuditLogFromDate] = useState('');
  const [auditLogToDate, setAuditLogToDate] = useState('');
  const [auditLogTotal, setAuditLogTotal] = useState(0);
  const [auditLogPage, setAuditLogPage] = useState(0);
  const [auditLogLimit] = useState(50);
  const [showAuditLogFilters, setShowAuditLogFilters] = useState(false);
  const [showApiTestAdvanced, setShowApiTestAdvanced] = useState(false);
  const [showHttpHeaders, setShowHttpHeaders] = useState(false);

  // Load tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['system', 'attributes', 'outbound-api', 'system-log', 'inbound-api', 'users'].includes(tab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  // Close endpoint dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEndpointDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.endpoint-dropdown-container')) {
          setShowEndpointDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEndpointDropdown]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCoreModalOpen, setIsCoreModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<CustomAttribute | null>(null);
  const [editingCoreAttribute, setEditingCoreAttribute] = useState<CoreAttributeConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dataType: 'string' as CustomAttribute['dataType'],
    required: false,
    options: [] as string[],
  });
  const [coreFormData, setCoreFormData] = useState({
    displayName: '',
    dataType: 'string' as CoreAttributeConfig['dataType'],
    required: false,
    options: [] as string[],
  });
  const [newOption, setNewOption] = useState('');
  const [newCoreOption, setNewCoreOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coreErrors, setCoreErrors] = useState<Record<string, string>>({});
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
      options: [],
    });
    setNewOption('');
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
        options: attribute.options || [],
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
    if (formData.dataType === 'select' && formData.options.length === 0) {
      newErrors.options = 'At least one option is required for select type';
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

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()],
      }));
      setNewOption('');
      if (errors.options) {
        setErrors(prev => ({ ...prev, options: '' }));
      }
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleMoveOptionUp = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const newOptions = [...prev.options];
      [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
      return { ...prev, options: newOptions };
    });
  };

  const handleMoveOptionDown = (index: number) => {
    if (index === formData.options.length - 1) return;
    setFormData(prev => {
      const newOptions = [...prev.options];
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
      return { ...prev, options: newOptions };
    });
  };

  // Core attribute handlers
  const openCoreModal = (attribute: CoreAttributeConfig) => {
    setEditingCoreAttribute(attribute);
    setCoreFormData({
      displayName: attribute.displayName,
      dataType: attribute.dataType,
      required: attribute.required,
      options: attribute.options || [],
    });
    setIsCoreModalOpen(true);
  };

  const closeCoreModal = () => {
    setIsCoreModalOpen(false);
    setCoreFormData({
      displayName: '',
      dataType: 'string',
      required: false,
      options: [],
    });
    setNewCoreOption('');
    setCoreErrors({});
    setEditingCoreAttribute(null);
  };

  const validateCoreAttribute = () => {
    const newErrors: Record<string, string> = {};
    if (!coreFormData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    if (coreFormData.dataType === 'select' && coreFormData.options.length === 0) {
      newErrors.options = 'At least one option is required for select type';
    }
    setCoreErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCoreSubmit = () => {
    if (!validateCoreAttribute() || !editingCoreAttribute) return;

    updateCoreAttribute(editingCoreAttribute.id, coreFormData);
    closeCoreModal();
  };

  const handleAddCoreOption = () => {
    if (newCoreOption.trim()) {
      setCoreFormData(prev => ({
        ...prev,
        options: [...prev.options, newCoreOption.trim()],
      }));
      setNewCoreOption('');
      if (coreErrors.options) {
        setCoreErrors(prev => ({ ...prev, options: '' }));
      }
    }
  };

  const handleRemoveCoreOption = (index: number) => {
    setCoreFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleMoveCoreOptionUp = (index: number) => {
    if (index === 0) return;
    setCoreFormData(prev => {
      const newOptions = [...prev.options];
      [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
      return { ...prev, options: newOptions };
    });
  };

  const handleMoveCoreOptionDown = (index: number) => {
    if (index === coreFormData.options.length - 1) return;
    setCoreFormData(prev => {
      const newOptions = [...prev.options];
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
      return { ...prev, options: newOptions };
    });
  };

  const handleSaveOktaSettings = async () => {
    try {
      const response = await fetch('/api/okta-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oktaSettings),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message
        setOktaSaved(true);

        // Show restart notification
        alert(data.message + '\n\nThe page will reload automatically once the server restarts.');

        // Wait for server restart and reload page
        // Poll the server every second to check if it's back up
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 30 seconds

        const checkServerAndReload = setInterval(async () => {
          attempts++;
          try {
            const healthCheck = await fetch('/api/auth/session', {
              method: 'GET',
              cache: 'no-store'
            });

            if (healthCheck.ok) {
              clearInterval(checkServerAndReload);
              // Server is back, reload the page
              window.location.reload();
            }
          } catch (err) {
            // Server still restarting, continue polling
            if (attempts >= maxAttempts) {
              clearInterval(checkServerAndReload);
              alert('Server is taking longer than expected to restart. Please refresh the page manually.');
            }
          }
        }, 1000);
      } else {
        alert(data.error || 'Failed to save Okta settings');
      }
    } catch (error) {
      console.error('Error saving Okta settings:', error);
      alert('Error saving Okta settings');
    }
  };

  // API Test functions
  const sampleBodies = {
    createEmployee: {
      type: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      department: 'Engineering',
      title: 'Software Engineer',
      manager: 'Jane Smith',
      status: 'active',
      startDate: '2024-01-15',
      customAttributes: {}
    },
    createContractor: {
      type: 'contractor',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      department: 'Marketing',
      title: 'Marketing Consultant',
      manager: 'John Manager',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      customAttributes: {}
    },
    updateEmployee: {
      title: 'Senior Software Engineer',
      status: 'active'
    }
  };

  const loadSampleBody = (type: keyof typeof sampleBodies) => {
    setRequestBody(JSON.stringify(sampleBodies[type], null, 2));
  };

  const buildUrlWithParams = () => {
    const validParams = queryParams.filter(p => p.key && p.value);
    if (validParams.length === 0) return endpoint;

    const params = new URLSearchParams();
    validParams.forEach(p => params.append(p.key, p.value));

    const baseUrl = endpoint.split('?')[0];
    return `${baseUrl}?${params.toString()}`;
  };

  const handleApiTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken.trim()) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      if (customHeaders.trim()) {
        try {
          const parsed = JSON.parse(customHeaders);
          Object.assign(headers, parsed);
        } catch (err) {
          throw new Error('Invalid JSON in custom headers');
        }
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if ((method === 'POST' || method === 'PUT') && requestBody.trim()) {
        try {
          JSON.parse(requestBody);
          options.body = requestBody;
        } catch (err) {
          throw new Error('Invalid JSON in request body');
        }
      }

      const finalUrl = buildUrlWithParams();
      const response = await fetch(finalUrl, options);
      const endTime = performance.now();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        duration: endTime - startTime,
      });
    } catch (error) {
      const endTime = performance.now();
      setResult({
        status: 0,
        statusText: 'Network Error',
        data: null,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: endTime - startTime,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    const dataToCopy = result.data && typeof result.data === 'object' && result.data.data
      ? result.data.data
      : result.data;
    const text = JSON.stringify(dataToCopy, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearApiForm = () => {
    setEndpoint('/api/employees');
    setMethod('GET');
    setAuthToken('');
    setCustomHeaders('');
    setRequestBody('');
    setQueryParams([]);
    setResult(null);
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-gray-600';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };


  // Users management functions
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Load Outbound API settings when tab is active
  useEffect(() => {
    if (activeTab === 'outbound-api') {
      loadOutboundApiSettings();
    }
  }, [activeTab]);

  // Load Audit Logs when tab is active or page changes
  useEffect(() => {
    if (activeTab === 'system-log') {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditLogPage]);

  // Load Okta Settings when system tab is active
  useEffect(() => {
    if (activeTab === 'system') {
      loadOktaSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadOktaSettings = async () => {
    setOktaLoading(true);
    try {
      const response = await fetch('/api/okta-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setOktaSettings({
            clientId: data.settings.clientId || '',
            clientSecret: data.settings.clientSecret || '',
            issuer: data.settings.issuer || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading Okta settings:', error);
    } finally {
      setOktaLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Load both local and federated users
      const [localResponse, federatedResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/federated-users')
      ]);

      const localUsers = localResponse.ok ? (await localResponse.json()).users || [] : [];
      const federatedUsers = federatedResponse.ok ? (await federatedResponse.json()).data || [] : [];

      // Combine and format users
      const allUsers = [
        ...localUsers.map((u: any) => ({ ...u, type: 'local' })),
        ...federatedUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          type: 'federated',
          provider: u.provider,
          lastLogin: u.lastLoginAt
        }))
      ];

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: 'admin' | 'viewer', userType: string) => {
    try {
      const endpoint = userType === 'federated'
        ? `/api/federated-users/${userId}`
        : `/api/users/${userId}`;

      const response = await fetch(endpoint, {
        method: userType === 'federated' ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    }
  };

  const handleDeleteUser = async (userId: string, userType: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const endpoint = userType === 'federated'
        ? `/api/federated-users/${userId}`
        : `/api/users/${userId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  // Outbound API functions
  const loadOutboundApiSettings = async () => {
    setOutboundApiLoading(true);
    try {
      const response = await fetch('/api/outbound-api');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOutboundApiSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading outbound API settings:', error);
    } finally {
      setOutboundApiLoading(false);
    }
  };

  const saveOutboundApiSettings = async () => {
    setOutboundApiLoading(true);
    setOutboundApiSaved(false);
    try {
      const response = await fetch('/api/outbound-api', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outboundApiSettings),
      });

      if (response.ok) {
        setOutboundApiSaved(true);
        setTimeout(() => setOutboundApiSaved(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving outbound API settings:', error);
      alert('Error saving settings');
    } finally {
      setOutboundApiLoading(false);
    }
  };

  const testOperation = async (operation: 'create' | 'update' | 'delete') => {
    setTestingOperation(operation);
    setOutboundTestResult(null);
    try {
      let payload;
      let httpMethod: 'POST' | 'PUT' | 'DELETE';

      if (operation === 'create') {
        httpMethod = 'POST';
        try {
          payload = JSON.parse(payloadFormat);
        } catch (e) {
          setOutboundTestResult({
            success: false,
            error: 'Invalid JSON in Payload Format',
          });
          setTestingOperation(null);
          return;
        }
      } else if (operation === 'update') {
        httpMethod = 'PUT';
        try {
          payload = JSON.parse(payloadFormat);
        } catch (e) {
          setOutboundTestResult({
            success: false,
            error: 'Invalid JSON in Payload Format',
          });
          setTestingOperation(null);
          return;
        }
      } else {
        httpMethod = 'DELETE';
        // For delete, send minimal data
        payload = {
          profile: {
            email: "isaac.brock@example.com"
          }
        };
      }

      const response = await fetch('/api/outbound-api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: outboundApiSettings.url,
          headers: outboundApiSettings.headers,
          method: httpMethod,
          payload,
        }),
      });

      const data = await response.json();
      setOutboundTestResult({
        ...data,
        sentPayload: payload,
        httpMethod: httpMethod,
      });
    } catch (error) {
      setOutboundTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setTestingOperation(null);
    }
  };

  const resetPayloadFormat = () => {
    setPayloadFormat(defaultPayloadFormat);
    setPayloadValidationError('');
  };

  const validatePayloadFormat = (value: string) => {
    setPayloadFormat(value);
    if (!value.trim()) {
      setPayloadValidationError('Payload cannot be empty');
      return;
    }
    try {
      JSON.parse(value);
      setPayloadValidationError('');
    } catch (e) {
      if (e instanceof Error) {
        setPayloadValidationError(e.message);
      } else {
        setPayloadValidationError('Invalid JSON format');
      }
    }
  };

  const addOutboundHeader = () => {
    setOutboundApiSettings({
      ...outboundApiSettings,
      headers: [...outboundApiSettings.headers, { key: '', value: '' }],
    });
  };

  const updateOutboundHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...outboundApiSettings.headers];
    newHeaders[index][field] = value;
    setOutboundApiSettings({ ...outboundApiSettings, headers: newHeaders });
  };

  const removeOutboundHeader = (index: number) => {
    const newHeaders = outboundApiSettings.headers.filter((_, i) => i !== index);
    setOutboundApiSettings({ ...outboundApiSettings, headers: newHeaders });
  };

  // Audit Log functions
  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditLogSearch) params.append('search', auditLogSearch);
      if (auditLogFromDate) params.append('fromDate', auditLogFromDate);
      if (auditLogToDate) params.append('toDate', auditLogToDate);
      params.append('limit', auditLogLimit.toString());
      params.append('offset', (auditLogPage * auditLogLimit).toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setAuditLogTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditLogSearch, auditLogFromDate, auditLogToDate, auditLogLimit, auditLogPage]);

  const handleAuditLogSearch = () => {
    setAuditLogPage(0); // Reset to first page when searching
    loadAuditLogs();
  };

  const clearAuditLogFilters = () => {
    setAuditLogSearch('');
    setAuditLogFromDate('');
    setAuditLogToDate('');
    setAuditLogPage(0);
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
        <div>
          <span className="capitalize">
            {attr.dataType === 'select' ? 'Dropdown' : attr.dataType === 'string' ? 'Text' : attr.dataType === 'boolean' ? 'Yes/No' : attr.dataType}
          </span>
          {attr.dataType === 'select' && attr.options && attr.options.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              ({attr.options.length} option{attr.options.length !== 1 ? 's' : ''})
            </div>
          )}
        </div>
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

  const formatDataType = (attr: CoreAttributeConfig) => {
    if (attr.dataType === 'select' && attr.options && attr.options.length > 0) {
      return `Dropdown (${attr.options.join(', ')})`;
    }
    return attr.dataType === 'string' ? 'Text' :
           attr.dataType === 'boolean' ? 'Yes/No' :
           attr.dataType === 'date' ? 'Date' :
           attr.dataType === 'number' ? 'Number' :
           attr.dataType === 'currency' ? 'Currency' : attr.dataType;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system settings and employee attributes</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px flex-wrap">
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'system'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon size={18} />
              System Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon size={18} />
              HRMIS Users
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'attributes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Sliders size={18} />
              Manage Attributes
            </button>
            <button
              onClick={() => setActiveTab('outbound-api')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'outbound-api'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Send size={18} />
              Outbound API
            </button>
            <button
              onClick={() => setActiveTab('inbound-api')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inbound-api'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Webhook size={18} />
              Inbound API
            </button>
            <button
              onClick={() => setActiveTab('system-log')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'system-log'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database size={18} />
              System Log
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Configuration</h2>
                <p className="text-sm text-gray-600">
                  Configure application-wide settings such as company branding and general preferences.
                </p>
              </div>

              {/* Company Logo Section */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Logo</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload your company logo to display in the navigation bar. Maximum file size: 2MB.
                </p>
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {logo ? (
                      <div className="relative">
                        <img
                          src={logo}
                          alt="Company Logo"
                          className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg p-2 bg-white"
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
                      <div className="h-24 w-24 bg-white rounded-lg flex items-center justify-center border-2 border-gray-200 border-dashed">
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

              {/* Okta Integration Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Okta Integration</h2>
                <p className="text-sm text-gray-600 mb-2">
                  Configure Okta OAuth settings to enable authentication for your organization. These settings are used for:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li><strong>Single Sign-On (SSO):</strong> Allow users to log in using their Okta credentials</li>
                  <li><strong>API Authentication:</strong> Enable external systems to access APIs using OAuth Bearer tokens</li>
                </ul>
              </div>

              {/* Success Message */}
              {oktaSaved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Settings Saved</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your Okta configuration has been saved. Note: You&apos;ll need to restart the application for changes to take effect.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">OAuth Configuration</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Enter your Okta application credentials. You can find these values in your Okta Admin Console under Applications.
                </p>

                {oktaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading current settings...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Client ID"
                      value={oktaSettings.clientId}
                      onChange={(e) => setOktaSettings({ ...oktaSettings, clientId: e.target.value })}
                      placeholder="0oa1234abcd5678efgh"
                      required
                    />

                    <div>
                      <Input
                        label="Client Secret"
                        type="password"
                        value={oktaSettings.clientSecret}
                        onChange={(e) => setOktaSettings({ ...oktaSettings, clientSecret: e.target.value })}
                        placeholder="Enter your Okta client secret"
                        required
                      />
                      {oktaSettings.clientSecret.startsWith('••••') && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current secret is masked for security. Enter a new value to update it.
                        </p>
                      )}
                    </div>

                    <Input
                      label="Issuer URL"
                      value={oktaSettings.issuer}
                      onChange={(e) => setOktaSettings({ ...oktaSettings, issuer: e.target.value })}
                      placeholder="https://your-domain.okta.com/oauth2/default"
                      required
                    />

                    <div className="flex justify-end pt-4">
                      <Button variant="primary" onClick={handleSaveOktaSettings}>
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Configure Okta</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li className="flex gap-2">
                    <span className="font-medium">1.</span>
                    <span>Log in to your Okta Admin Console at <code className="bg-blue-100 px-1 rounded">https://your-domain.okta.com/admin</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">2.</span>
                    <span>Navigate to Applications &gt; Applications and create a new &quot;Web&quot; application</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">3.</span>
                    <span>Configure the Sign-in redirect URI: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/okta` : 'http://localhost:3001/api/auth/callback/okta'}</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">4.</span>
                    <span>Configure the Sign-out redirect URI: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">5.</span>
                    <span>Copy the Client ID and Client Secret from the application settings</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">6.</span>
                    <span>Your Issuer URL is typically: <code className="bg-blue-100 px-1 rounded">https://your-domain.okta.com/oauth2/default</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">7.</span>
                    <span>After saving, update your <code className="bg-blue-100 px-1 rounded">.env.local</code> file with these values and restart the application</span>
                  </li>
                </ol>

                <div className="mt-4 p-4 bg-blue-100 rounded border border-blue-300">
                  <p className="text-sm font-medium text-blue-900 mb-2">Environment Variables Required:</p>
                  <pre className="text-xs text-blue-800 font-mono">
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default</pre>
                </div>

                <div className="mt-4 p-4 bg-green-100 rounded border border-green-300">
                  <p className="text-sm font-medium text-green-900 mb-2">Security Features Enabled:</p>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li>✓ <strong>PKCE (Proof Key for Code Exchange)</strong> - Prevents authorization code interception attacks</li>
                    <li>✓ <strong>State Parameter Validation</strong> - Protects against CSRF attacks</li>
                    <li>✓ <strong>SHA-256 Code Challenge</strong> - Enhanced security for the authorization flow</li>
                  </ul>
                </div>
              </div>

              {/* OAuth API Authentication Section */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">OAuth API Authentication</h3>
                <p className="text-sm text-purple-800 mb-4">
                  Once configured, external systems can authenticate to the HRMIS APIs using OAuth Bearer tokens. This uses the same Client ID and Client Secret configured above.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-2">How External Clients Authenticate:</p>
                    <ol className="space-y-2 text-sm text-purple-800">
                      <li className="flex gap-2">
                        <span className="font-medium">1.</span>
                        <span>Obtain an access token from Okta using Client Credentials flow:</span>
                      </li>
                    </ol>
                    <pre className="mt-2 p-3 bg-purple-100 rounded text-xs font-mono overflow-x-auto">
{`POST ${oktaSettings.issuer || 'https://your-domain.okta.com/oauth2/default'}/v1/token
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=api_access`}</pre>
                  </div>

                  <div>
                    <ol className="space-y-2 text-sm text-purple-800" start={2}>
                      <li className="flex gap-2">
                        <span className="font-medium">2.</span>
                        <span>Include the access token in API requests:</span>
                      </li>
                    </ol>
                    <pre className="mt-2 p-3 bg-purple-100 rounded text-xs font-mono overflow-x-auto">
{`GET /api/employees
Authorization: Bearer <access_token>`}</pre>
                  </div>

                  <div className="mt-4 p-3 bg-purple-100 rounded border border-purple-300">
                    <p className="text-xs font-medium text-purple-900 mb-2">Supported Endpoints:</p>
                    <ul className="text-xs text-purple-800 space-y-1">
                      <li>• All employee endpoints: <code>/api/employees</code>, <code>/api/employees/[id]</code></li>
                      <li>• Custom attributes: <code>/api/custom-attributes</code></li>
                      <li>• Users management: <code>/api/users</code>, <code>/api/federated-users</code></li>
                      <li>• Audit logs: <code>/api/audit-logs</code></li>
                      <li>• Export schedules: <code>/api/export-schedules</code></li>
                    </ul>
                  </div>

                  <div className="mt-4 p-3 bg-purple-100 rounded border border-purple-300">
                    <p className="text-xs font-medium text-purple-900 mb-2">Authentication Priority:</p>
                    <p className="text-xs text-purple-800">
                      API endpoints check for OAuth Bearer tokens first, then fall back to NextAuth session authentication.
                      OAuth clients are treated as admin users by default for API access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attributes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Employee Attributes</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage core employee fields and add custom attributes for your organization.
                  </p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                  <Plus size={18} className="mr-2" />
                  Add Custom Attribute
                </Button>
              </div>

              {/* Core Attributes Section */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Core Attributes</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      These attributes are included with every employee record. Click edit to customize data types and options.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={resetToDefaults} className="text-sm">
                    Reset to Defaults
                  </Button>
                </div>
                <div className="overflow-x-auto bg-white rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
              {coreAttributes.map((attr) => (
                <tr key={attr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attr.displayName}
                    {attr.locked && <span className="ml-2 text-xs text-gray-500">(locked)</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDataType(attr)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={attr.required}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateCoreAttribute(attr.id, { required: e.target.checked });
                        }}
                        disabled={attr.locked}
                        className={`w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded ${
                          attr.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title={attr.locked ? 'Locked attributes cannot be modified' : (attr.required ? 'Mark as optional' : 'Mark as required')}
                      />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attr.required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {attr.required ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openCoreModal(attr)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Attributes Section */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Custom Attributes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {attributes.length} custom attribute{attributes.length !== 1 ? 's' : ''} defined
                </p>
              </div>
              <div className="bg-white rounded-lg">
                <Table
                  data={attributes}
                  columns={columns}
                  emptyMessage="No custom attributes defined. Add your first attribute to get started."
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'outbound-api' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Outbound API Configuration</h2>
              <p className="text-sm text-gray-600">
                Configure an external API to receive employee data when create, update, or delete operations occur.
              </p>
            </div>

            {outboundApiLoading && (
              <div className="text-center py-4 text-gray-600">Loading settings...</div>
            )}

            {!outboundApiLoading && (
              <div className="space-y-6">
                {/* API URL */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoint</h3>
                  <Input
                    label="Target API URL"
                    type="url"
                    value={outboundApiSettings.url}
                    onChange={(e) => setOutboundApiSettings({ ...outboundApiSettings, url: e.target.value })}
                    placeholder="https://api.example.com/employees"
                    required
                  />
                </div>

                {/* Headers Configuration */}
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setShowHttpHeaders(!showHttpHeaders)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">HTTP Headers</h3>
                      {showHttpHeaders ? (
                        <ChevronUp size={20} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-500" />
                      )}
                    </div>
                  </button>

                  {showHttpHeaders && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4 pt-6">
                        <p className="text-sm text-gray-600">
                          Add custom headers such as Content-Type, Authorization, etc.
                        </p>
                        <Button variant="secondary" onClick={addOutboundHeader}>
                          <Plus size={16} />
                          Add Header
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {outboundApiSettings.headers.map((header, index) => (
                          <div key={index} className="flex gap-3 items-end">
                            <div className="flex-1">
                              <Input
                                label={index === 0 ? 'Header Name' : ''}
                                value={header.key}
                                onChange={(e) => updateOutboundHeader(index, 'key', e.target.value)}
                                placeholder="e.g., Authorization"
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                label={index === 0 ? 'Header Value' : ''}
                                value={header.value}
                                onChange={(e) => updateOutboundHeader(index, 'value', e.target.value)}
                                placeholder="e.g., Bearer token123"
                              />
                            </div>
                            <button
                              onClick={() => removeOutboundHeader(index)}
                              className="text-red-600 hover:text-red-800 p-2 mb-1"
                              title="Remove header"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Operations Toggle */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Trigger Operations</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select which operations should trigger outbound API calls
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Create Employee</h4>
                        <p className="text-sm text-gray-600">Send data when a new employee is created</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={outboundApiSettings.operations.create}
                            onChange={(e) => setOutboundApiSettings({
                              ...outboundApiSettings,
                              operations: { ...outboundApiSettings.operations, create: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <Button
                          variant="secondary"
                          onClick={() => testOperation('create')}
                          disabled={testingOperation !== null || !outboundApiSettings.url}
                        >
                          {testingOperation === 'create' ? 'Testing...' : 'Test Create'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Update Employee</h4>
                        <p className="text-sm text-gray-600">Send data when an employee is updated</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={outboundApiSettings.operations.update}
                            onChange={(e) => setOutboundApiSettings({
                              ...outboundApiSettings,
                              operations: { ...outboundApiSettings.operations, update: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <Button
                          variant="secondary"
                          onClick={() => testOperation('update')}
                          disabled={testingOperation !== null || !outboundApiSettings.url}
                        >
                          {testingOperation === 'update' ? 'Testing...' : 'Test Update'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Delete Employee</h4>
                        <p className="text-sm text-gray-600">Send data when an employee is deleted</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={outboundApiSettings.operations.delete}
                            onChange={(e) => setOutboundApiSettings({
                              ...outboundApiSettings,
                              operations: { ...outboundApiSettings.operations, delete: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <Button
                          variant="secondary"
                          onClick={() => testOperation('delete')}
                          disabled={testingOperation !== null || !outboundApiSettings.url}
                        >
                          {testingOperation === 'delete' ? 'Testing...' : 'Test Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payload Format */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-blue-900">Payload Format</h3>
                    <Button variant="secondary" onClick={resetPayloadFormat}>
                      Reset to Default
                    </Button>
                  </div>
                  <p className="text-sm text-blue-800 mb-4">
                    Edit the JSON payload that will be sent for Create and Update operations. The Delete operation uses minimal data.
                  </p>
                  <textarea
                    value={payloadFormat}
                    onChange={(e) => validatePayloadFormat(e.target.value)}
                    className={`w-full px-4 py-3 bg-white rounded border text-sm font-mono focus:outline-none focus:ring-2 ${
                      payloadValidationError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-blue-300 focus:ring-blue-500'
                    }`}
                    rows={10}
                  />
                  {payloadValidationError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-900">Invalid JSON Format:</p>
                      <p className="text-sm text-red-700 mt-1 font-mono">{payloadValidationError}</p>
                      <p className="text-sm text-red-600 mt-2">
                        Common issues: Missing quotes around property names, missing commas between properties, or unmatched brackets.
                      </p>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="primary"
                    onClick={saveOutboundApiSettings}
                    disabled={outboundApiLoading}
                  >
                    {outboundApiLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>

                {outboundApiSaved && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900">
                      Outbound API settings saved successfully!
                    </p>
                  </div>
                )}

                {/* Test Results */}
                {outboundTestResult && (
                  <div className={`p-4 rounded-lg ${
                    outboundTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {outboundTestResult.success ? (
                          <Check className="text-green-600" size={20} />
                        ) : (
                          <X className="text-red-600" size={20} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${
                          outboundTestResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {outboundTestResult.success ? 'Test Successful' : 'Test Failed'}
                        </h4>
                        {outboundTestResult.httpMethod && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">HTTP Method:</span> {outboundTestResult.httpMethod}
                          </p>
                        )}
                        {outboundTestResult.statusCode && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Status:</span> {outboundTestResult.statusCode} {outboundTestResult.statusText}
                          </p>
                        )}
                        {outboundTestResult.duration && (
                          <p className="text-sm">
                            <span className="font-medium">Duration:</span> {outboundTestResult.duration}
                          </p>
                        )}
                        {outboundTestResult.error && (
                          <p className="text-sm mt-1 text-red-800">
                            <span className="font-medium">Error:</span> {outboundTestResult.error}
                          </p>
                        )}
                        {outboundTestResult.sentPayload && (
                          <details className="mt-2">
                            <summary className="text-sm font-medium cursor-pointer">View Sent Payload</summary>
                            <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto max-h-64">
                              {JSON.stringify(outboundTestResult.sentPayload, null, 2)}
                            </pre>
                          </details>
                        )}
                        {outboundTestResult.response && (
                          <details className="mt-2">
                            <summary className="text-sm font-medium cursor-pointer">View Response</summary>
                            <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto max-h-64">
                              {JSON.stringify(outboundTestResult.response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'system-log' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Audit Log</h2>
              <p className="text-sm text-gray-600">
                View detailed audit trail of all system operations including user actions, API calls, and configuration changes.
              </p>
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-gray-50 rounded-lg border border-gray-200">
              <button
                onClick={() => setShowAuditLogFilters(!showAuditLogFilters)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                {showAuditLogFilters ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </button>
              {showAuditLogFilters && (
                <div className="px-6 pb-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                    <div className="md:col-span-3">
                      <Input
                        label="Search"
                        type="text"
                        value={auditLogSearch}
                        onChange={(e) => setAuditLogSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAuditLogSearch();
                          }
                        }}
                        placeholder="Search by description, action, user, or error message..."
                      />
                    </div>

                    <div>
                      <Input
                        label="From Date"
                        type="datetime-local"
                        value={auditLogFromDate}
                        onChange={(e) => setAuditLogFromDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <Input
                        label="To Date"
                        type="datetime-local"
                        value={auditLogToDate}
                        onChange={(e) => setAuditLogToDate(e.target.value)}
                      />
                    </div>

                    <div className="flex items-end gap-3">
                      <Button variant="primary" onClick={handleAuditLogSearch}>
                        Apply Filters
                      </Button>
                      <Button variant="secondary" onClick={clearAuditLogFilters}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    Showing {auditLogs.length} of {auditLogTotal} log entries
                  </div>
                </div>
              )}
            </div>

            {/* Audit Log Table */}
            {auditLogsLoading ? (
              <div className="text-center py-8 text-gray-600">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
                <Database size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No audit log entries found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.level === 'success' ? 'bg-green-100 text-green-800' :
                              log.level === 'error' ? 'bg-red-100 text-red-800' :
                              log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.userName || log.userEmail || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <div className="truncate" title={log.description}>
                              {log.description}
                            </div>
                            {log.errorMessage && (
                              <div className="text-xs text-red-600 mt-1 truncate" title={log.errorMessage}>
                                Error: {log.errorMessage}
                              </div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                  View Details
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.duration ? `${log.duration}ms` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.success ? 'Success' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {auditLogPage + 1} of {Math.ceil(auditLogTotal / auditLogLimit)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setAuditLogPage(Math.max(0, auditLogPage - 1))}
                      disabled={auditLogPage === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setAuditLogPage(auditLogPage + 1)}
                      disabled={(auditLogPage + 1) * auditLogLimit >= auditLogTotal}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Audit Log Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-semibold mb-2">Log Levels:</h4>
                  <ul className="space-y-1">
                    <li><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">success</span> - Operation completed successfully</li>
                    <li><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">error</span> - Operation failed</li>
                    <li><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">warning</span> - Operation completed with warnings</li>
                    <li><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">info</span> - Informational message</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Action Types:</h4>
                  <ul className="space-y-1">
                    <li><strong>user.*</strong> - User account operations</li>
                    <li><strong>employee.*</strong> - Employee management operations</li>
                    <li><strong>api.*</strong> - API calls (inbound/outbound)</li>
                    <li><strong>config.*</strong> - Configuration changes</li>
                    <li><strong>system.*</strong> - System-level operations</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-blue-800 mt-4">
                The system retains up to 10,000 most recent log entries. Older entries are automatically purged.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'inbound-api' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Inbound API Test Console</h2>
              <p className="text-sm text-gray-600">
                Test REST API endpoints with custom headers, authentication tokens, and request bodies.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Panel */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Request</h3>

                <form onSubmit={handleApiTest} className="space-y-4">
                  <Select
                    label="HTTP Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as HttpMethod)}
                    options={[
                      { value: 'GET', label: 'GET' },
                      { value: 'POST', label: 'POST' },
                      { value: 'PUT', label: 'PUT' },
                      { value: 'DELETE', label: 'DELETE' },
                    ]}
                  />

                  <div className="relative endpoint-dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="/api/employees"
                        required
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEndpointDropdown(!showEndpointDropdown)}
                          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ChevronDown size={20} className={`transition-transform ${showEndpointDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showEndpointDropdown && (
                          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
                            {inboundEndpoints.map((ep) => (
                              <button
                                key={ep}
                                type="button"
                                onClick={() => {
                                  setEndpoint(ep);
                                  setShowEndpointDropdown(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                {ep}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowApiTestAdvanced(!showApiTestAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {showApiTestAdvanced ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                    Advanced Options
                  </button>

                  {showApiTestAdvanced && (
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                      <Input
                        label="Auth Token (Bearer)"
                        type="password"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="Optional: Bearer token for authentication"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Headers (JSON)
                        </label>
                        <textarea
                          value={customHeaders}
                          onChange={(e) => setCustomHeaders(e.target.value)}
                          placeholder='{"X-Custom-Header": "value"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}

                  {(method === 'POST' || method === 'PUT') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Body
                      </label>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => loadSampleBody('createEmployee')}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          Employee Sample
                        </button>
                        <button
                          type="button"
                          onClick={() => loadSampleBody('createContractor')}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          Contractor Sample
                        </button>
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder="Request body in JSON format"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                        rows={10}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      <Send size={16} className="mr-2" />
                      {loading ? 'Sending...' : 'Send Request'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={clearApiForm}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </form>
              </div>

              {/* Response Panel */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Response</h3>
                  {result && (
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  )}
                </div>

                {!result ? (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <p>Send a request to see the response</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                        <span className="text-gray-600">{result.statusText}</span>
                        <span className="ml-auto text-sm text-gray-500">
                          {result.duration.toFixed(2)}ms
                        </span>
                      </div>
                    </div>

                    {result.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">{result.error}</p>
                      </div>
                    )}

                    {!result.error && result.data && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 max-h-96 overflow-auto">
                        <pre className="text-xs font-mono text-gray-700">
                          {typeof result.data === 'string'
                            ? result.data
                            : JSON.stringify(result.data, null, 2)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">HRMIS User Management</h2>
              <p className="text-sm text-gray-600">
                Manage user accounts and their roles within the application. Local users are manually created, while federated users are created automatically when they authenticate through Okta.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Users ({users.length})
              </h3>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.type === 'federated' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.type === 'federated' ? `Federated (${user.provider || 'Okta'})` : 'Local'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={user.role}
                              onChange={(e) => handleUserRoleChange(user.id, e.target.value as 'admin' | 'viewer', user.type)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.type)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete user"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">About Federated Users</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span>•</span>
                  <span><strong>Federated users</strong> are created automatically when someone logs in through Okta for the first time.</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>New federated users are assigned the <strong>Viewer</strong> role by default. You can change their role here.</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Deleting a federated user will remove them from the system, but they can log in again through Okta to recreate their account.</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span><strong>Local users</strong> are manually created accounts that don&apos;t require Okta authentication.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Core Attribute Edit Modal */}
    <Modal
      isOpen={isCoreModalOpen}
      onClose={closeCoreModal}
      title={`Edit Core Attribute: ${editingCoreAttribute?.displayName}`}
      footer={
        <>
          <Button variant="ghost" onClick={closeCoreModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCoreSubmit}>
            Update
          </Button>
        </>
      }
      >
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={coreFormData.displayName}
            onChange={(e) => setCoreFormData({ ...coreFormData, displayName: e.target.value })}
            error={coreErrors.displayName}
            placeholder="e.g., Department, Job Title"
            required
          />

          <Select
            label="Data Type"
            value={coreFormData.dataType}
            onChange={(e) => {
              const newDataType = e.target.value as CoreAttributeConfig['dataType'];
              setCoreFormData({ ...coreFormData, dataType: newDataType });
              if (newDataType !== 'select') {
                setCoreFormData(prev => ({ ...prev, options: [] }));
              }
            }}
            options={[
              { value: 'string', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'date', label: 'Date' },
              { value: 'boolean', label: 'Yes/No' },
              { value: 'currency', label: 'Currency' },
              { value: 'select', label: 'Dropdown' },
            ]}
            required
          />

        {coreFormData.dataType === 'select' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Dropdown Options
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={newCoreOption}
                onChange={(e) => setNewCoreOption(e.target.value)}
                placeholder="Enter option"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCoreOption();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddCoreOption}>
                Add
              </Button>
            </div>
            {coreErrors.options && (
              <p className="text-sm text-red-600">{coreErrors.options}</p>
            )}
            {coreFormData.options.length > 0 && (
              <div className="mt-2 space-y-1">
                {coreFormData.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm text-gray-700">{option}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCoreOptionUp(index)}
                        disabled={index === 0}
                        className={`p-1 ${
                          index === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        title="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCoreOptionDown(index)}
                        disabled={index === coreFormData.options.length - 1}
                        className={`p-1 ${
                          index === coreFormData.options.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        title="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreOption(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Remove option"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="coreRequired"
            checked={coreFormData.required}
            onChange={(e) => setCoreFormData({ ...coreFormData, required: e.target.checked })}
            disabled={editingCoreAttribute?.locked}
            className={`w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded ${
              editingCoreAttribute?.locked ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <label htmlFor="coreRequired" className="text-sm font-medium text-gray-700">
            Required field
            {editingCoreAttribute?.locked && <span className="ml-2 text-xs text-gray-500">(locked)</span>}
          </label>
        </div>
      </div>
    </Modal>

    {/* Add/Edit Custom Attribute Modal */}
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
          onChange={(e) => {
            const newDataType = e.target.value as CustomAttribute['dataType'];
            setFormData({ ...formData, dataType: newDataType });
            // Clear options if switching away from select type
            if (newDataType !== 'select') {
              setFormData(prev => ({ ...prev, options: [] }));
            }
          }}
          options={[
            { value: 'string', label: 'Text' },
            { value: 'number', label: 'Number' },
            { value: 'date', label: 'Date' },
            { value: 'boolean', label: 'Yes/No' },
            { value: 'currency', label: 'Currency' },
            { value: 'select', label: 'Dropdown' },
            ]}
            required
          />

          {formData.dataType === 'select' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Dropdown Options
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Enter option"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddOption}>
                  Add
                </Button>
              </div>
              {errors.options && (
                <p className="text-sm text-red-600">{errors.options}</p>
              )}
              {formData.options.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-700">{option}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveOptionUp(index)}
                          disabled={index === 0}
                          className={`p-1 ${
                            index === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOptionDown(index)}
                          disabled={index === formData.options.length - 1}
                          className={`p-1 ${
                            index === formData.options.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Remove option"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
