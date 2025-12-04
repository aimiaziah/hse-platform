// Input Validation Schemas
// Validates all API request inputs to prevent injection attacks and data corruption
import { z } from 'zod';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PIN login validation
 */
export const LoginSchema = z.object({
  pin: z
    .string({
      required_error: 'PIN is required',
      invalid_type_error: 'PIN must be a string',
    })
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User role enum
 */
export const UserRoleSchema = z.enum(['admin', 'inspector', 'supervisor', 'employee'], {
  errorMap: () => ({ message: 'Invalid role' }),
});

/**
 * Create user validation
 */
export const UserCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),

  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers'),

  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),

  role: UserRoleSchema,

  isActive: z.boolean().optional().default(true),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

/**
 * Update user validation (all fields optional)
 */
export const UserUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
    .optional(),

  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers')
    .optional(),

  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),

  role: UserRoleSchema.optional(),

  isActive: z.boolean().optional(),

  signature: z.string().optional(),
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

/**
 * Reset PIN validation
 */
export const ResetPinSchema = z.object({
  newPin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers'),
});

export type ResetPinInput = z.infer<typeof ResetPinSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inspection type enum
 */
export const InspectionTypeSchema = z.enum(
  ['hse', 'fire_extinguisher', 'first_aid', 'manhours_report', 'hse_observation'],
  {
    errorMap: () => ({ message: 'Invalid inspection type' }),
  }
);

/**
 * Inspection status enum
 */
export const InspectionStatusSchema = z.enum(
  ['draft', 'pending_review', 'completed', 'approved', 'rejected'],
  {
    errorMap: () => ({ message: 'Invalid status' }),
  }
);

/**
 * Create inspection validation (Supabase format)
 */
export const InspectionCreateSchema = z.object({
  inspection_type: InspectionTypeSchema,
  inspector_id: z.string().uuid('Invalid inspector ID').optional(), // Optional, can be set from auth
  location_id: z.string().uuid('Invalid location ID').optional().nullable(),
  asset_id: z.string().uuid('Invalid asset ID').optional().nullable(),
  inspection_date: z.string().optional(), // ISO date string
  form_data: z.record(z.any()), // Flexible JSON data
  status: InspectionStatusSchema.optional().default('draft'),
  signature: z.string().optional().nullable(),
  remarks: z.string().max(2000, 'Remarks too long').optional().nullable(),
  items: z.array(z.object({
    label: z.string().min(1, 'Item label required'),
    answer: z.any().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

export type InspectionCreateInput = z.infer<typeof InspectionCreateSchema>;

/**
 * Update inspection validation
 */
export const InspectionUpdateSchema = z.object({
  location_id: z.string().uuid('Invalid location ID').optional().nullable(),
  asset_id: z.string().uuid('Invalid asset ID').optional().nullable(),
  inspection_date: z.string().optional(),
  form_data: z.record(z.any()).optional(),
  status: InspectionStatusSchema.optional(),
  signature: z.string().optional().nullable(),
  remarks: z.string().max(2000, 'Remarks too long').optional().nullable(),
  reviewComments: z.string().max(2000, 'Review comments too long').optional().nullable(),
});

export type InspectionUpdateInput = z.infer<typeof InspectionUpdateSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// MANHOURS REPORT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Monthly data entry for manhours report
 */
export const MonthlyDataSchema = z.object({
  month: z.string().min(1, 'Month is required'),
  manPower: z.string(),
  manHours: z.string(),
  accidents: z.string(),
});

/**
 * Manhours report validation
 */
export const ManhoursReportSchema = z.object({
  preparedBy: z.string().min(1, 'Prepared by is required').max(100, 'Name too long'),
  preparedDate: z.string().min(1, 'Prepared date is required'),
  reviewedBy: z.string().max(100).optional(),
  reviewedDate: z.string().optional(),
  reportMonth: z.string().min(1, 'Report month is required'),
  reportYear: z.string().min(1, 'Report year is required').regex(/^\d{4}$/, 'Invalid year format'),

  // Statistics
  numEmployees: z.string(),
  monthlyManHours: z.string(),
  yearToDateManHours: z.string().optional(),
  totalAccumulatedManHours: z.string().optional(),
  workdaysLost: z.string().optional(),
  ltiCases: z.string(),
  noLTICases: z.string(),
  nearMissAccidents: z.string(),
  dangerousOccurrences: z.string(),
  occupationalDiseases: z.string(),

  // Project and monthly data
  projectName: z.string().max(200).optional(),
  monthlyData: z.array(MonthlyDataSchema),

  // Meta
  status: z.enum(['draft', 'completed', 'pending_review']).optional().default('draft'),
  remarks: z.string().max(2000).optional(),
});

export type ManhoursReportInput = z.infer<typeof ManhoursReportSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMMON VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UUID validation
 */
export const UUIDSchema = z.string().uuid('Invalid ID format');

/**
 * Date validation
 */
export const DateSchema = z.string().datetime('Invalid date format');

/**
 * Pagination validation
 */
export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().default(1)),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().positive().max(100).default(50)),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      details: Array<{ field: string; message: string }>;
    };

/**
 * Validate request data against a Zod schema
 * Returns typed result with clear error messages
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Log validation failure for security monitoring
  logger.warn('Validation failed', {
    context,
    errors: result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });

  return {
    success: false,
    error: 'Validation failed',
    details: result.error.errors.map((err) => ({
      field: err.path.join('.') || 'unknown',
      message: err.message,
    })),
  };
}

/**
 * Validate and return data or throw error
 * Use this when you want to throw on validation failure
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = validateRequest(schema, data, context);

  if (!result.success) {
    const error = new Error(`Validation failed: ${result.error}`);
    (error as any).details = result.details;
    throw error;
  }

  return result.data;
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: unknown
): ValidationResult<T> {
  return validateRequest(schema, query, 'query-params');
}

/**
 * Validate request body
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  return validateRequest(schema, body, 'request-body');
}

/**
 * Validate path parameters
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): ValidationResult<T> {
  return validateRequest(schema, params, 'path-params');
}

/**
 * Create custom validation error response
 */
export function createValidationError(message: string, field?: string) {
  return {
    success: false,
    error: 'Validation failed',
    details: [
      {
        field: field || 'unknown',
        message,
      },
    ],
  };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate file upload
 */
export const FileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(
      /^[a-zA-Z0-9_\-. ]+$/,
      'Filename contains invalid characters'
    ),

  mimetype: z.string().min(1, 'Mime type is required'),

  size: z
    .number()
    .positive('File size must be positive')
    .max(10 * 1024 * 1024, 'File size must be less than 10MB'),
});

export type FileUploadInput = z.infer<typeof FileUploadSchema>;

/**
 * Validate email domain against whitelist
 */
export function validateEmailDomain(
  email: string,
  allowedDomains: string[]
): boolean {
  if (allowedDomains.length === 0) return true;

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return allowedDomains.some((allowed) =>
    domain === allowed.toLowerCase()
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base export request schema
 */
export const ExportRequestSchema = z.object({
  inspectedBy: z.string().min(1, 'Inspector name is required').max(100),
  inspectionDate: z.string().min(1, 'Inspection date is required'),
  designation: z.string().min(1, 'Designation is required').max(100),
  signature: z.string().optional(),
  reviewedBy: z.string().max(100).optional(),
  reviewedAt: z.string().optional(),
  reviewerSignature: z.string().optional(),
  format: z.enum(['excel', 'pdf']).optional().default('excel'),
  remarks: z.string().max(2000).optional(),
});

/**
 * Fire extinguisher export validation
 */
export const FireExtinguisherExportSchema = ExportRequestSchema.extend({
  extinguishers: z.array(z.object({
    no: z.number().int().positive(),
    serialNo: z.string().min(1, 'Serial number is required'),
    location: z.string().min(1, 'Location is required'),
    typeSize: z.string().min(1, 'Type/Size is required'),
    shell: z.string().nullable().optional(),
    hose: z.string().nullable().optional(),
    nozzle: z.string().nullable().optional(),
    pressureGauge: z.string().nullable().optional(),
    safetyPin: z.string().nullable().optional(),
    pinSeal: z.string().nullable().optional(),
    accessible: z.string().nullable().optional(),
    missingNotInPlace: z.string().nullable().optional(),
    emptyPressureLow: z.string().nullable().optional(),
    servicingTags: z.string().nullable().optional(),
    expiryDate: z.string(),
    remarks: z.string(),
    aiScanned: z.boolean().optional(),
    aiConfidence: z.record(z.number()).optional(),
    aiCapturedImages: z.array(z.any()).optional(),
  })).min(1, 'At least one extinguisher is required'),
});

export type FireExtinguisherExportInput = z.infer<typeof FireExtinguisherExportSchema>;

/**
 * Query string validation for listing endpoints
 * Note: Query parameters come as strings, we transform them to appropriate types
 */
export const ListQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional().default(1).transform(val => {
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }).pipe(z.number().int().positive()),
  limit: z.union([z.string(), z.number()]).optional().default(50).transform(val => {
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }).pipe(z.number().int().positive()),
  offset: z.union([z.string(), z.number()]).optional().default(0).transform(val => {
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }).pipe(z.number().int().nonnegative()),
  status: z.string().optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  year: z.string().optional().refine(val => !val || /^\d{4}$/.test(val), 'Invalid year format'),
  month: z.string().optional(),
  inspector_id: z.string().optional(), // Validate UUID separately if needed
  inspection_type: z.string().optional(), // Keep as string to match query params
});

export type ListQueryInput = z.infer<typeof ListQuerySchema>;

// Export common schemas for reuse
export const schemas = {
  // Auth
  login: LoginSchema,

  // User management
  userCreate: UserCreateSchema,
  userUpdate: UserUpdateSchema,
  resetPin: ResetPinSchema,

  // Inspections
  inspectionCreate: InspectionCreateSchema,
  inspectionUpdate: InspectionUpdateSchema,
  inspectionType: InspectionTypeSchema,
  inspectionStatus: InspectionStatusSchema,

  // Manhours
  manhoursReport: ManhoursReportSchema,
  monthlyData: MonthlyDataSchema,

  // Exports
  exportRequest: ExportRequestSchema,
  fireExtinguisherExport: FireExtinguisherExportSchema,

  // Common
  pagination: PaginationSchema,
  listQuery: ListQuerySchema,
  uuid: UUIDSchema,
  date: DateSchema,
  fileUpload: FileUploadSchema,
  userRole: UserRoleSchema,
};
