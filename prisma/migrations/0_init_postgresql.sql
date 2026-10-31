-- ==============================================================================
-- CELEBRA — PostgreSQL Production Schema & Relational DDL Migration
-- Target: PostgreSQL 14+
-- ==============================================================================

-- Enums
CREATE TYPE "SystemUserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "EventRole" AS ENUM ('OWNER', 'PLANNER', 'COLLABORATOR', 'VIEWER');
CREATE TYPE "EventType" AS ENUM ('WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'ENGAGEMENT', 'BABY_SHOWER', 'CORPORATE', 'CULTURAL', 'COMMUNITY', 'CUSTOM');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');
CREATE TYPE "RsvpStatus" AS ENUM ('ATTENDING', 'DECLINED', 'MAYBE', 'PENDING');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED', 'FAILED');
CREATE TYPE "QuoteStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'ACCEPTED', 'DECLINED', 'EXPIRED');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PROVISIONAL', 'CONFIRMED', 'CANCELLED');

-- 1. Users Table
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SystemUserRole" DEFAULT 'USER' NOT NULL,
    "emailVerified" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "User_email_idx" ON "User"("email");

-- 2. User Sessions Table
CREATE TABLE "UserSession" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT
);
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");

-- 3. Events Table
CREATE TABLE "Event" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '' NOT NULL,
    "eventType" "EventType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT DEFAULT 'To be announced' NOT NULL,
    "city" TEXT DEFAULT '' NOT NULL,
    "country" TEXT DEFAULT '' NOT NULL,
    "guestTarget" INTEGER DEFAULT 50 NOT NULL,
    "budgetMinor" BIGINT DEFAULT 0 NOT NULL,
    "currency" TEXT DEFAULT 'USD' NOT NULL,
    "status" "EventStatus" DEFAULT 'PLANNING' NOT NULL,
    "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Event_ownerId_idx" ON "Event"("ownerId");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- 4. Event Members & RBAC
CREATE TABLE "EventMember" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" "EventRole" NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "EventMember_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE INDEX "EventMember_eventId_idx" ON "EventMember"("eventId");
CREATE INDEX "EventMember_userId_idx" ON "EventMember"("userId");

-- 5. Event Preferences
CREATE TABLE "EventPreference" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT UNIQUE NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "theme" TEXT DEFAULT '' NOT NULL,
    "colorPaletteJson" TEXT DEFAULT '[]' NOT NULL,
    "tone" TEXT DEFAULT 'Festive & Elegant' NOT NULL,
    "culturalTraditionsJson" TEXT DEFAULT '[]' NOT NULL,
    "dietaryNotes" TEXT DEFAULT '' NOT NULL,
    "musicPreferences" TEXT DEFAULT '' NOT NULL,
    "notes" TEXT DEFAULT '' NOT NULL
);

-- 6. Event Budget & Categories
CREATE TABLE "EventBudget" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT UNIQUE NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "totalBudgetMinor" BIGINT DEFAULT 0 NOT NULL,
    "currency" TEXT DEFAULT 'USD' NOT NULL,
    "contingencyPercent" INTEGER DEFAULT 10 NOT NULL,
    "notes" TEXT DEFAULT '' NOT NULL
);

CREATE TABLE "BudgetCategory" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "allocatedMinor" BIGINT DEFAULT 0 NOT NULL,
    "spentMinor" BIGINT DEFAULT 0 NOT NULL,
    "icon" TEXT,
    "color" TEXT
);
CREATE INDEX "BudgetCategory_eventId_idx" ON "BudgetCategory"("eventId");

-- 7. Vendor Categories & Vendors
CREATE TABLE "VendorCategory" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT DEFAULT '' NOT NULL
);

CREATE TABLE "Vendor" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "categoryId" TEXT NOT NULL REFERENCES "VendorCategory"("id") ON DELETE RESTRICT,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "status" TEXT DEFAULT 'RESEARCHING' NOT NULL,
    "notes" TEXT,
    "rating" INTEGER DEFAULT 5,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Vendor_eventId_idx" ON "Vendor"("eventId");
CREATE INDEX "Vendor_categoryId_idx" ON "Vendor"("categoryId");

-- 8. Expenses & Payments (Financial Minor Units)
CREATE TABLE "Expense" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "categoryId" TEXT NOT NULL REFERENCES "BudgetCategory"("id") ON DELETE CASCADE,
    "vendorId" TEXT REFERENCES "Vendor"("id") ON DELETE SET NULL,
    "title" TEXT NOT NULL,
    "amountMinor" BIGINT DEFAULT 0 NOT NULL,
    "currency" TEXT DEFAULT 'USD' NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

CREATE TABLE "Payment" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "expenseId" TEXT NOT NULL REFERENCES "Expense"("id") ON DELETE CASCADE,
    "amountMinor" BIGINT DEFAULT 0 NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionRef" TEXT,
    "paidAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "PaymentStatus" DEFAULT 'COMPLETED' NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Payment_eventId_idx" ON "Payment"("eventId");
CREATE INDEX "Payment_expenseId_idx" ON "Payment"("expenseId");

-- 9. Vendor Quotes & Bookings
CREATE TABLE "VendorQuote" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "vendorId" TEXT NOT NULL REFERENCES "Vendor"("id") ON DELETE CASCADE,
    "quoteAmountMinor" BIGINT DEFAULT 0 NOT NULL,
    "currency" TEXT DEFAULT 'USD' NOT NULL,
    "details" TEXT NOT NULL,
    "status" "QuoteStatus" DEFAULT 'REQUESTED' NOT NULL,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "VendorQuote_eventId_idx" ON "VendorQuote"("eventId");
CREATE INDEX "VendorQuote_vendorId_idx" ON "VendorQuote"("vendorId");

CREATE TABLE "VendorBooking" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "vendorId" TEXT NOT NULL REFERENCES "Vendor"("id") ON DELETE CASCADE,
    "contractAmountMinor" BIGINT DEFAULT 0 NOT NULL,
    "depositAmountMinor" BIGINT DEFAULT 0 NOT NULL,
    "status" "BookingStatus" DEFAULT 'PROVISIONAL' NOT NULL,
    "contractUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "VendorBooking_eventId_idx" ON "VendorBooking"("eventId");
CREATE INDEX "VendorBooking_vendorId_idx" ON "VendorBooking"("vendorId");

-- 10. Guests, RSVPs & Seating
CREATE TABLE "GuestGroup" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL
);
CREATE INDEX "GuestGroup_eventId_idx" ON "GuestGroup"("eventId");

CREATE TABLE "Guest" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "groupId" TEXT REFERENCES "GuestGroup"("id") ON DELETE SET NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "rsvpStatus" "RsvpStatus" DEFAULT 'PENDING' NOT NULL,
    "dietaryRequirements" TEXT,
    "isPlusOne" BOOLEAN DEFAULT false NOT NULL,
    "plusOneOf" TEXT,
    "seatingTable" TEXT,
    "invitationCode" TEXT UNIQUE NOT NULL,
    "invitationSentAt" TIMESTAMP(3),
    "rsvpRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");
CREATE INDEX "Guest_invitationCode_idx" ON "Guest"("invitationCode");
CREATE INDEX "Guest_rsvpStatus_idx" ON "Guest"("rsvpStatus");

CREATE TABLE "SeatingAssignment" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "tableNumber" INTEGER NOT NULL,
    "tableName" TEXT DEFAULT 'Table' NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "guestId" TEXT NOT NULL REFERENCES "Guest"("id") ON DELETE CASCADE,
    CONSTRAINT "SeatingAssignment_table_seat_key" UNIQUE ("eventId", "tableNumber", "seatNumber")
);
CREATE INDEX "SeatingAssignment_eventId_idx" ON "SeatingAssignment"("eventId");
CREATE INDEX "SeatingAssignment_guestId_idx" ON "SeatingAssignment"("guestId");

-- 11. Milestones, Tasks & Dependencies
CREATE TABLE "Milestone" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT DEFAULT 'PENDING' NOT NULL,
    "orderIndex" INTEGER DEFAULT 0 NOT NULL
);
CREATE INDEX "Milestone_eventId_idx" ON "Milestone"("eventId");

CREATE TABLE "Task" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '' NOT NULL,
    "category" TEXT DEFAULT 'General' NOT NULL,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "PriorityLevel" DEFAULT 'MEDIUM' NOT NULL,
    "status" "TaskStatus" DEFAULT 'TODO' NOT NULL,
    "milestoneId" TEXT REFERENCES "Milestone"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Task_eventId_idx" ON "Task"("eventId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

CREATE TABLE "TaskDependency" (
    "id" TEXT PRIMARY KEY,
    "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
    "dependsOnTaskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
    CONSTRAINT "TaskDependency_task_depends_key" UNIQUE ("taskId", "dependsOnTaskId")
);

-- 12. Event Schedule & Run of Show
CREATE TABLE "EventSchedule" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "speakerOrHost" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER DEFAULT 0 NOT NULL
);
CREATE INDEX "EventSchedule_eventId_idx" ON "EventSchedule"("eventId");

-- 13. Risk Register & Mitigations
CREATE TABLE "RiskItem" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "category" TEXT DEFAULT 'Operational' NOT NULL,
    "probability" INTEGER DEFAULT 1 NOT NULL,
    "impact" INTEGER DEFAULT 1 NOT NULL,
    "riskScore" INTEGER DEFAULT 1 NOT NULL,
    "status" TEXT DEFAULT 'IDENTIFIED' NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "RiskItem_eventId_idx" ON "RiskItem"("eventId");
CREATE INDEX "RiskItem_riskScore_idx" ON "RiskItem"("riskScore");

CREATE TABLE "RiskMitigation" (
    "id" TEXT PRIMARY KEY,
    "riskId" TEXT NOT NULL REFERENCES "RiskItem"("id") ON DELETE CASCADE,
    "mitigationPlan" TEXT NOT NULL,
    "contingencyPlan" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT DEFAULT 'PLANNED' NOT NULL
);
CREATE INDEX "RiskMitigation_riskId_idx" ON "RiskMitigation"("riskId");

-- 14. Activity Audit Logs
CREATE TABLE "ActivityLog" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "ActivityLog_eventId_idx" ON "ActivityLog"("eventId");
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- 15. Documents & AI Audit
CREATE TABLE "UploadedDocument" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT UNIQUE NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "UploadedDocument_eventId_idx" ON "UploadedDocument"("eventId");
CREATE INDEX "UploadedDocument_userId_idx" ON "UploadedDocument"("userId");

CREATE TABLE "AiGeneration" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "serviceType" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputParamsJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "AiGeneration_eventId_idx" ON "AiGeneration"("eventId");
CREATE INDEX "AiGeneration_serviceType_idx" ON "AiGeneration"("serviceType");

CREATE TABLE "AiFeedback" (
    "id" TEXT PRIMARY KEY,
    "generationId" TEXT NOT NULL REFERENCES "AiGeneration"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "AiFeedback_generationId_idx" ON "AiFeedback"("generationId");

CREATE TABLE "Notification" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "Notification_eventId_idx" ON "Notification"("eventId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

