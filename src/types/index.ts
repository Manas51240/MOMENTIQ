// ==============================================================================
// CELEBRA — Core Types & Relational Entity Definitions
// ==============================================================================

export type SystemUserRole = 'USER' | 'ADMIN';

export type EventRole = 'OWNER' | 'PLANNER' | 'COLLABORATOR' | 'VIEWER';

export type EventType =
  | 'WEDDING'
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'ENGAGEMENT'
  | 'BABY_SHOWER'
  | 'CORPORATE'
  | 'CULTURAL'
  | 'COMMUNITY'
  | 'CUSTOM';

export type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type RsvpStatus = 'ATTENDING' | 'DECLINED' | 'MAYBE' | 'PENDING';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

export type QuoteStatus = 'REQUESTED' | 'RECEIVED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export type BookingStatus = 'DRAFT' | 'PROVISIONAL' | 'CONFIRMED' | 'CANCELLED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: SystemUserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  guestTarget: number;
  budgetMinor: number; // Currency in minor integer units (e.g. 10000 = $100.00)
  currency: string;
  status: EventStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventMember {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventPreference {
  id: string;
  eventId: string;
  theme: string;
  colorPalette: string[];
  tone: string;
  culturalTraditions: string[];
  dietaryNotes: string;
  musicPreferences: string;
  notes: string;
}

export interface EventBudget {
  id: string;
  eventId: string;
  totalBudgetMinor: number;
  currency: string;
  contingencyPercent: number;
  notes: string;
}

export interface BudgetCategory {
  id: string;
  eventId: string;
  name: string;
  allocatedMinor: number;
  spentMinor: number;
  icon?: string;
  color?: string;
}

export interface Expense {
  id: string;
  eventId: string;
  categoryId: string;
  vendorId?: string;
  title: string;
  amountMinor: number;
  currency: string;
  dueDate?: string;
  status: PaymentStatus;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  eventId: string;
  expenseId: string;
  amountMinor: number;
  paymentMethod: string;
  transactionRef?: string;
  paidAt: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  categoryId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'RESEARCHING' | 'CONTACTED' | 'QUOTED' | 'HIRED' | 'REJECTED';
  notes?: string;
  rating?: number;
  createdAt: string;
}

export interface VendorQuote {
  id: string;
  eventId: string;
  vendorId: string;
  quoteAmountMinor: number;
  currency: string;
  details: string;
  status: QuoteStatus;
  validUntil?: string;
  createdAt: string;
}

export interface VendorBooking {
  id: string;
  eventId: string;
  vendorId: string;
  contractAmountMinor: number;
  depositAmountMinor: number;
  status: BookingStatus;
  contractUrl?: string;
  signedAt?: string;
  createdAt: string;
}

export interface GuestGroup {
  id: string;
  eventId: string;
  name: string;
}

export interface Guest {
  id: string;
  eventId: string;
  groupId?: string;
  name: string;
  email?: string;
  phone?: string;
  rsvpStatus: RsvpStatus;
  dietaryRequirements?: string;
  isPlusOne: boolean;
  plusOneOf?: string;
  seatingTable?: string;
  invitationCode: string;
  invitationSentAt?: string;
  rsvpRespondedAt?: string;
  createdAt: string;
}

export interface SeatingAssignment {
  id: string;
  eventId: string;
  tableNumber: number;
  tableName: string;
  seatNumber: number;
  guestId: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description: string;
  category: string;
  assignedToId?: string;
  dueDate: string;
  priority: PriorityLevel;
  status: TaskStatus;
  milestoneId?: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export interface Milestone {
  id: string;
  eventId: string;
  title: string;
  targetDate: string;
  status: 'PENDING' | 'REACHED' | 'DELAYED';
  orderIndex: number;
}

export interface EventScheduleItem {
  id: string;
  eventId: string;
  startTime: string; // ISO string or HH:MM
  endTime: string;
  title: string;
  location?: string;
  speakerOrHost?: string;
  notes?: string;
  orderIndex: number;
}

export interface RiskItem {
  id: string;
  eventId: string;
  title: string;
  category: string;
  probability: number; // 1 to 5
  impact: number;      // 1 to 5
  riskScore: number;   // probability * impact (1 to 25)
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
  notes?: string;
  createdAt: string;
}

export interface RiskMitigation {
  id: string;
  riskId: string;
  mitigationPlan: string;
  contingencyPlan: string;
  ownerId?: string;
  status: 'PLANNED' | 'ACTIVE' | 'RESOLVED';
}

export interface ActivityLog {
  id: string;
  eventId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson?: string;
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  eventId: string;
  userId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  createdAt: string;
}

export interface AiGeneration {
  id: string;
  eventId: string;
  serviceType: string;
  promptVersion: string;
  latencyMs: number;
  inputParamsJson: string;
  outputJson: string;
  createdAt: string;
}

export interface AiFeedback {
  id: string;
  generationId: string;
  userId: string;
  rating: number; // 1-5
  comments?: string;
  createdAt: string;
}

// Session Identity Payload for verified server-side requests
export interface AuthenticatedUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: SystemUserRole;
  };
  sessionId: string;
  expiresAt: string;
}

// Event Permission Result
export interface EventAccessResult {
  hasAccess: boolean;
  role?: EventRole;
  isOwner: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
}

