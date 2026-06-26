'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Send, Copy, Check, Trash2 } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';

// This page allows testing of inbound API endpoints

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

export default function InboundApiPage() {
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

    // Copy the data payload if it exists, otherwise copy the full response
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inbound API Test Console</h1>
        <p className="mt-2 text-gray-600">
          Test inbound REST API endpoints with custom headers, authentication tokens, and request bodies
        </p>
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Note:</strong> This app uses browser localStorage.
            {employees.length === 0 ? (
              <>
                {' '}You currently have <strong className="text-red-600">no employees</strong> in the system. Add some first via the{' '}
                <a href="/employees" className="underline hover:text-blue-900 font-semibold">Manage Employees</a> page using the Test Data feature.
              </>
            ) : (
              <>
                {' '}You have <strong className="text-green-600">{employees.length} employee{employees.length !== 1 ? 's' : ''}</strong> in the system.
              </>
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                const raw = localStorage.getItem('hrmis_employees');
                if (!raw) {
                  alert('❌ localStorage is EMPTY. Go to /test-data and click "Add Sample Employees"');
                } else {
                  const parsed = JSON.parse(raw);
                  alert(`✅ Found ${parsed.length} employees in localStorage:\n\n${parsed.map((e: any) => `- ${e.firstName} ${e.lastName} (${e.email})`).join('\n')}`);
                }
              }}
              className="text-xs px-3 py-1 bg-white border border-blue-300 rounded hover:bg-blue-50"
            >
              Check localStorage
            </button>
            <a
              href="/test-data"
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Test Data
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request</h2>

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

            {/* Query Parameters */}
            {method === 'GET' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Query Parameters (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={addQueryParam}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    + Add Parameter
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
                          <option value="">Select parameter...</option>
                          <optgroup label="Record Type">
                            <option value="type">type</option>
                            <option value="status">status</option>
                          </optgroup>
                          <optgroup label="Personal Info">
                            <option value="firstName">firstName</option>
                            <option value="lastName">lastName</option>
                            <option value="email">email</option>
                          </optgroup>
                          <optgroup label="Job Info">
                            <option value="department">department</option>
                            <option value="title">title</option>
                            <option value="manager">manager</option>
                          </optgroup>
                          <optgroup label="Dates">
                            <option value="fromDate">fromDate (start date &gt;=)</option>
                            <option value="toDate">toDate (start date &lt;=)</option>
                          </optgroup>
                          <optgroup label="Search">
                            <option value="search">search (name/email)</option>
                          </optgroup>
                        </select>
                        <Input
                          value={param.value}
                          onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                          placeholder={
                            param.key === 'type' ? 'employee or contractor' :
                            param.key === 'status' ? 'active, inactive, or terminated' :
                            param.key === 'fromDate' || param.key === 'toDate' ? 'YYYY-MM-DD' :
                            'value'
                          }
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

                {queryParams.length > 0 && (
                  <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                    <p className="text-xs text-gray-600 font-mono break-all">
                      {buildUrlWithParams()}
                    </p>
                  </div>
                )}

                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                    View filtering examples
                  </summary>
                  <div className="mt-2 space-y-1 text-xs text-gray-600 bg-blue-50 rounded p-3">
                    <div><code>type=employee</code> - Only employees</div>
                    <div><code>type=contractor</code> - Only contractors</div>
                    <div><code>status=active</code> - Only active records</div>
                    <div><code>department=Engineering</code> - Specific department</div>
                    <div><code>fromDate=2024-01-01</code> - Started on or after date</div>
                    <div><code>search=john</code> - Search name or email</div>
                    <div className="pt-1 border-t border-blue-200 mt-2">
                      <strong>Custom Attributes:</strong> Use <code>customAttributes.fieldName=value</code>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Auth Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authorization Token (Optional)
              </label>
              <Input
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Bearer token or just the token"
              />
              <p className="mt-1 text-xs text-gray-500">
                Will be added as Authorization header. Prefix with Bearer will be added automatically if not present.
              </p>
            </div>

            {/* Custom Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Headers (Optional)
              </label>
              <textarea
                value={customHeaders}
                onChange={(e) => setCustomHeaders(e.target.value)}
                placeholder={'{\n  "X-Custom-Header": "value"\n}'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                JSON format. These will be merged with default headers.
              </p>
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
                    Load Employee Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleBody('createContractor')}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    Load Contractor Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleBody('updateEmployee')}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    Load Update Sample
                  </button>
                </div>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Request body in JSON format"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  rows={12}
                />
              </div>
            )}

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Response</h2>
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
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Send a request to see the response</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
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
                  <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}

              {/* Data Payload - Show prominently if success and data field exists */}
              {!result.error && result.data && typeof result.data === 'object' && result.data.data !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Data Payload</h3>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200 max-h-96 overflow-auto">
                    <pre className="text-xs font-mono text-gray-800">
                      {JSON.stringify(result.data.data, null, 2)}
                    </pre>
                  </div>
                  {Array.isArray(result.data.data) && result.data.data.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500 italic">
                      No records found. The data array is empty.
                    </p>
                  )}
                  {/* Show metadata if exists */}
                  {(result.data.success !== undefined || result.data.count !== undefined || result.data.message) && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      {result.data.success !== undefined && (
                        <div>
                          <span className="font-medium">Success:</span>{' '}
                          <span className={result.data.success ? 'text-green-600' : 'text-red-600'}>
                            {String(result.data.success)}
                          </span>
                        </div>
                      )}
                      {result.data.count !== undefined && (
                        <div>
                          <span className="font-medium">Count:</span> {result.data.count}
                        </div>
                      )}
                      {result.data.message && (
                        <div>
                          <span className="font-medium">Message:</span> {result.data.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Show plain response if no wrapped data */}
              {!result.error && (!result.data || typeof result.data !== 'object' || result.data.data === undefined) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Response Data</h3>
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

              {/* Full Response Body */}
              <div>
                <details className="group">
                  <summary className="text-sm font-medium text-gray-700 mb-2 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                    <span>Full Response Body</span>
                    <span className="text-xs text-gray-500 group-open:hidden">(click to expand)</span>
                  </summary>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-96 overflow-auto mt-2">
                    <pre className="text-xs font-mono text-gray-700">
                      {typeof result.data === 'string'
                        ? result.data
                        : JSON.stringify(result.data, null, 2)
                      }
                    </pre>
                  </div>
                </details>
              </div>

              {/* Response Headers */}
              <div>
                <details className="group">
                  <summary className="text-sm font-medium text-gray-700 mb-2 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                    <span>Response Headers</span>
                    <span className="text-xs text-gray-500 group-open:hidden">(click to expand)</span>
                  </summary>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2">
                    <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Available Endpoints</h3>
        <div className="space-y-3 text-sm">
          <div>
            <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">
              GET /api/employees
            </code>
            <p className="mt-1 text-blue-800">
              List all employees with optional filtering. Supports multiple query parameters:
            </p>
            <div className="mt-2 ml-4 space-y-1 text-xs">
              <div><code className="bg-white px-1 rounded">type</code> - employee | contractor</div>
              <div><code className="bg-white px-1 rounded">status</code> - active | inactive | terminated</div>
              <div><code className="bg-white px-1 rounded">department</code> - Filter by department name</div>
              <div><code className="bg-white px-1 rounded">firstName</code> - Partial match on first name</div>
              <div><code className="bg-white px-1 rounded">lastName</code> - Partial match on last name</div>
              <div><code className="bg-white px-1 rounded">email</code> - Partial match on email</div>
              <div><code className="bg-white px-1 rounded">title</code> - Partial match on title</div>
              <div><code className="bg-white px-1 rounded">manager</code> - Partial match on manager name</div>
              <div><code className="bg-white px-1 rounded">fromDate</code> - Start date &gt;= YYYY-MM-DD</div>
              <div><code className="bg-white px-1 rounded">toDate</code> - Start date &lt;= YYYY-MM-DD</div>
              <div><code className="bg-white px-1 rounded">search</code> - Global search (name or email)</div>
              <div><code className="bg-white px-1 rounded">customAttributes.{'{fieldName}'}</code> - Filter by custom attribute</div>
            </div>
            <div className="mt-2 text-xs bg-white rounded p-2">
              <strong>Examples:</strong>
              <div className="mt-1 space-y-1 font-mono text-gray-700">
                <div>/api/employees?type=contractor</div>
                <div>/api/employees?status=active&department=Engineering</div>
                <div>/api/employees?fromDate=2024-01-01&toDate=2024-12-31</div>
                <div>/api/employees?search=john&status=active</div>
              </div>
            </div>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded text-green-700 font-mono">
              POST /api/employees
            </code>
            <p className="mt-1 text-blue-800">
              Create a new employee. Required fields: type, firstName, lastName, email, department, title, manager, status, startDate
            </p>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">
              GET /api/employees/:id
            </code>
            <p className="mt-1 text-blue-800">
              Get a single employee by ID
            </p>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded text-yellow-700 font-mono">
              PUT /api/employees/:id
            </code>
            <p className="mt-1 text-blue-800">
              Update an existing employee. Only include fields you want to change.
            </p>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded text-red-700 font-mono">
              DELETE /api/employees/:id
            </code>
            <p className="mt-1 text-blue-800">
              Delete an employee by ID
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
