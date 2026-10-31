import { z } from 'zod';

// ==============================================================================
// AUTHENTICATION SCHEMAS
// ==============================================================================

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Valid email address is required')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Valid email address is required')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(16, 'Invalid or expired password reset token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ==============================================================================
// EVENT SCHEMAS
// ==============================================================================

export const eventTypeEnum = z.enum([
  'WEDDING',
  'BIRTHDAY',
  'ANNIVERSARY',
  'ENGAGEMENT',
  'BABY_SHOWER',
  'CORPORATE',
  'CULTURAL',
  'COMMUNITY',
  'CUSTOM',
]);

export const eventStatusEnum = z.enum([
  'DRAFT',
  'PLANNING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const createEventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).default(''),
  eventType: eventTypeEnum,
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string for startDate',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string for endDate',
  }),
  venue: z.string().trim().max(200).default('To be announced'),
  city: z.string().trim().max(100).default(''),
  country: z.string().trim().max(100).default(''),
  guestTarget: z.number().int().min(1, 'Target guest count must be at least 1').max(100000),
  budgetMinor: z.number().int().min(0, 'Budget in minor units cannot be negative'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: eventStatusEnum.optional(),
});

// ==============================================================================
// COLLABORATOR & MEMBER SCHEMAS
// ==============================================================================

export const eventRoleEnum = z.enum(['OWNER', 'PLANNER', 'COLLABORATOR', 'VIEWER']);

export const addCollaboratorSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  role: z.enum(['PLANNER', 'COLLABORATOR', 'VIEWER']),
});

export const updateCollaboratorSchema = z.object({
  role: z.enum(['PLANNER', 'COLLABORATOR', 'VIEWER']),
});

// ==============================================================================
// BUDGET & EXPENSE SCHEMAS
// ==============================================================================

export const createBudgetCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  allocatedMinor: z.number().int().min(0),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  vendorId: z.string().optional(),
  title: z.string().trim().min(2).max(150),
  amountMinor: z.number().int().min(1, 'Expense amount must be at least 1 minor unit'),
  dueDate: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED', 'FAILED']).default('PENDING'),
  notes: z.string().max(1000).optional(),
});

export const createPaymentSchema = z.object({
  amountMinor: z.number().int().min(1),
  paymentMethod: z.string().trim().min(2).max(50),
  transactionRef: z.string().trim().max(100).optional(),
  paidAt: z.string().default(() => new Date().toISOString()),
  status: z.enum(['COMPLETED', 'PENDING', 'FAILED']).default('COMPLETED'),
});

// ==============================================================================
// GUEST & RSVP SCHEMAS
// ==============================================================================

export const createGuestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  groupId: z.string().optional(),
  dietaryRequirements: z.string().trim().max(500).optional(),
  isPlusOne: z.boolean().default(false),
  plusOneOf: z.string().optional(),
  seatingTable: z.string().trim().max(50).optional(),
});

export const submitRsvpSchema = z.object({
  invitationCode: z.string().min(6).max(64),
  rsvpStatus: z.enum(['ATTENDING', 'DECLINED', 'MAYBE']),
  dietaryRequirements: z.string().trim().max(500).optional(),
  attendingCount: z.number().int().min(1).max(10).default(1),
});

// ==============================================================================
// TASK & TIMELINE SCHEMAS
// ==============================================================================

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).default(''),
  category: z.string().trim().max(50).default('General'),
  assignedToId: z.string().optional(),
  dueDate: z.string(),
  priority: priorityEnum.default('MEDIUM'),
  status: taskStatusEnum.default('TODO'),
  milestoneId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createScheduleItemSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  title: z.string().trim().min(2).max(150),
  location: z.string().trim().max(100).optional(),
  speakerOrHost: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  orderIndex: z.number().int().min(0).default(0),
});

// ==============================================================================
// VENDOR SCHEMAS
// ==============================================================================

export const createVendorSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  contactName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().url().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

export const createVendorQuoteSchema = z.object({
  vendorId: z.string().min(1),
  quoteAmountMinor: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
  details: z.string().trim().min(2).max(1000),
  validUntil: z.string().optional(),
});

// ==============================================================================
// RISK MANAGEMENT SCHEMAS
// ==============================================================================

export const createRiskSchema = z.object({
  title: z.string().trim().min(3).max(150),
  category: z.string().trim().max(50).default('Operational'),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  notes: z.string().trim().max(1000).optional(),
  mitigationPlan: z.string().trim().max(1000).optional(),
  contingencyPlan: z.string().trim().max(1000).optional(),
});

// ==============================================================================
// PAGINATION & QUERY SCHEMAS
// ==============================================================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

