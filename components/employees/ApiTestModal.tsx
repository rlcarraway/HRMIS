'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Send, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface TestResult {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  error?: string;
  duration: number;
}

const predefinedEndpoints = [
  { value: '/api/employees', label: 'GET /api/employees - List all employees' },
  { value: '/api/employees?fromDate=2024-01-01', label: 'GET /api/employees?fromDate - Filtered list' },
  { value: '/api/employees', label: 'POST /api/employees - Create employee' },
  { value: '/api/employees/:id', label: 'GET /api/employees/:id - Get single employee' },
  { value: '/api/employees/:id', label: 'PUT /api/employees/:id - Update employee' },
  { value: '/api/employees/:id', label: 'DELETE /api/employees/:id - Delete employee' },
];

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

interface ApiTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiTestModal({ isOpen, onClose }: ApiTestModalProps) {
  const { employees } = useEmployees();
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/api/employees');
  const [authToken, setAuthToken] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadSampleBody = (type: keyof typeof sampleBodies) => {
    setRequestBody(JSON.stringify(sampleBodies[type], null, 2));
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...queryParams];
    updated[index][field] = value;
    setQueryParams(updated);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const buildUrlWithParams = () => {
    const validParams = queryParams.filter(p => p.key && p.value);
    if (validParams.length === 0) return endpoint;

    const params = new URLSearchParams();
    validParams.forEach(p => params.append(p.key, p.value));

    const baseUrl = endpoint.split('?')[0];
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth token if provided
      if (authToken.trim()) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      // Add custom headers if provided
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

      // Add body for POST/PUT requests
      if ((method === 'POST' || method === 'PUT') && requestBody.trim()) {
        try {
          JSON.parse(requestBody); // Validate JSON
          options.body = requestBody;
        } catch (err) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Build URL with query parameters
      const finalUrl = buildUrlWithParams();

      const response = await fetch(finalUrl, options);
      const endTime = performance.now();

      // Extract response headers
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

  const clearForm = () => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="API Test Console"
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Test REST API endpoints with custom headers, authentication tokens, and request bodies.
            {employees.length === 0 ? (
              <span className="text-red-600 font-semibold"> No employees in the system. Generate test data first.</span>
            ) : (
              <span className="text-green-600 font-semibold"> {employees.length} employee{employees.length !== 1 ? 's' : ''} available.</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Request</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* HTTP Method */}
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

              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint
                </label>
                <Input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/employees"
                  required
                />
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quick Select:
                  </label>
                  <select
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => setEndpoint(e.target.value.split(' - ')[0].split(' ')[1])}
                    value=""
                  >
                    <option value="">Select a predefined endpoint...</option>
                    {predefinedEndpoints.map((ep, idx) => (
                      <option key={idx} value={ep.label}>
                        {ep.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Request Body */}
              {(method === 'POST' || method === 'PUT') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <button
                      type="button"
                      onClick={() => loadSampleBody('updateEmployee')}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Update Sample
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

              {/* Advanced Section */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Advanced Options
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Query Parameters */}
                    {method === 'GET' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Query Parameters
                          </label>
                          <button
                            type="button"
                            onClick={addQueryParam}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            + Add
                          </button>
                        </div>

                        {queryParams.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {queryParams.map((param, index) => (
                              <div key={index} className="flex gap-2 items-start">
                                <select
                                  value={param.key}
                                  onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">Select...</option>
                                  <option value="type">type</option>
                                  <option value="status">status</option>
                                  <option value="department">department</option>
                                  <option value="fromDate">fromDate</option>
                                  <option value="toDate">toDate</option>
                                  <option value="search">search</option>
                                </select>
                                <Input
                                  value={param.value}
                                  onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                                  placeholder="value"
                                  className="flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeQueryParam(index)}
                                  className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auth Token */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Authorization Token
                      </label>
                      <Input
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="Bearer token or just the token"
                      />
                    </div>

                    {/* Custom Headers */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Headers (JSON)
                      </label>
                      <textarea
                        value={customHeaders}
                        onChange={(e) => setCustomHeaders(e.target.value)}
                        placeholder={'{\n  "X-Custom-Header": "value"\n}'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  <Send size={16} />
                  {loading ? 'Sending...' : 'Send Request'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearForm}
                >
                  <Trash2 size={16} />
                  Clear
                </Button>
              </div>
            </form>
          </div>

          {/* Response Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Response</h3>
              {result && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
            </div>

            {!result ? (
              <div className="flex items-center justify-center h-64 text-gray-400 border border-gray-200 rounded-lg">
                <p>Send a request to see the response</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
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

                {/* Error */}
                {result.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                )}

                {/* Data */}
                {!result.error && result.data && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response Data</h4>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-96 overflow-auto">
                      <pre className="text-xs font-mono text-gray-700">
                        {typeof result.data === 'string'
                          ? result.data
                          : JSON.stringify(result.data, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
