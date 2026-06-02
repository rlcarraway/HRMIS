import { z } from 'zod';

// Employee form validation schema
export const employeeSchema = z.object({
  type: z.enum(['employee', 'contractor']),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  department: z.string().min(1, 'Department is required'),
  title: z.string().min(1, 'Title is required'),
  manager: z.string().min(1, 'Manager is required'),
  status: z.enum(['active', 'inactive', 'terminated']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    // Contractors must have end date
    if (data.type === 'contractor' && !data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'End date is required for contractors',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // End date must be after start date
    if (data.endDate && data.startDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Custom attribute validation schema
export const customAttributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dataType: z.enum(['string', 'number', 'date', 'boolean', 'currency']),
  required: z.boolean(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type CustomAttributeFormData = z.infer<typeof customAttributeSchema>;

// OAuth configuration validation schema
export const oauthConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  tokenUrl: z.string().url('Invalid token URL'),
  scope: z.string().optional(),
});

// Export schedule validation schema
export const exportScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(100),
  frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'hourly', 'minutes']),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  scheduledDate: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  intervalValue: z.number().min(1).max(1440).optional(),
  filters: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    department: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }),
  timezone: z.string(),
  enabled: z.boolean(),
  exportType: z.enum(['full', 'delta']),
  webhookUrl: z.string().url('Invalid webhook URL').optional().or(z.literal('')),
  webhookOAuth: oauthConfigSchema.optional(),
}).refine(
  (data) => {
    if (data.frequency === 'once') return !!data.scheduledDate;
    if (data.frequency === 'weekly') return data.dayOfWeek !== undefined;
    if (data.frequency === 'monthly') return data.dayOfMonth !== undefined;
    if (data.frequency === 'hourly') return data.intervalValue !== undefined && data.intervalValue >= 1 && data.intervalValue <= 24;
    if (data.frequency === 'minutes') return data.intervalValue !== undefined && data.intervalValue >= 1 && data.intervalValue <= 1440;
    return true;
  },
  { message: 'Missing required field for selected frequency' }
).refine(
  (data) => {
    // For 'once', validate that scheduled datetime is in the future
    if (data.frequency === 'once' && data.scheduledDate && data.scheduledTime) {
      const [hours, minutes] = data.scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(data.scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      return scheduledDateTime > new Date();
    }
    return true;
  },
  { message: 'Scheduled date and time must be in the future', path: ['scheduledDate'] }
);

export type ExportScheduleFormData = z.infer<typeof exportScheduleSchema>;
