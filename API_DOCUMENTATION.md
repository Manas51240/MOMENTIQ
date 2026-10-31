# CELEBRA — REST API Documentation & Endpoint Specification
### Comprehensive Reference for all 42 Endpoints

---

## 1. Authentication & Session Endpoints

### `POST /api/auth/register`
- **Auth**: Public (Rate-limited: 10/min)
- **Body**:
  ```json
  {
    "name": "Eleanor Vance",
    "email": "eleanor@example.com",
    "password": "StrongPassword123!",
    "role": "HOST" // "HOST" | "PLANNER" | "COLLABORATOR"
  }
  ```
- **Response**: `201 Created` with `user` object and `Set-Cookie: celebra_session=...`

### `POST /api/auth/login`
- **Auth**: Public (Rate-limited: 10/min)
- **Body**:
  ```json
  {
    "email": "eleanor@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response**: `200 OK` with user details and session cookie.

### `GET /api/auth/me`
- **Auth**: Session Cookie or Bearer Token
- **Response**: `200 OK` with `{ success: true, authenticated: true, user: { id, email, name, role } }`

### `POST /api/auth/logout`
- **Auth**: Session Cookie
- **Response**: `200 OK` (clears cookie)

### `POST /api/auth/reset-password`
- **Auth**: Public (Rate-limited)
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `200 OK` with token dispatch notification.

### `PUT /api/auth/reset-password`
- **Auth**: Public (Rate-limited)
- **Body**: `{ "token": "...", "newPassword": "NewStrongPassword123!" }`
- **Response**: `200 OK`

---

## 2. Event Workspace Endpoints

### `GET /api/events`
- **Auth**: Authenticated User
- **Query**: `page`, `limit`, `search`, `status`
- **Response**: `200 OK` with paginated event list and total counts.

### `POST /api/events`
- **Auth**: Authenticated User
- **Body**:
  ```json
  {
    "title": "Autumn Botanical Gala",
    "eventType": "WEDDING",
    "startDate": "2026-10-15T18:00:00Z",
    "endDate": "2026-10-16T02:00:00Z",
    "venue": "Crystalline Conservatory",
    "city": "San Francisco",
    "country": "USA",
    "guestTarget": 150,
    "budgetMinor": 4500000,
    "currency": "USD"
  }
  ```
- **Response**: `201 Created` with event details and initialized budget.

### `GET /api/events/[id]`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` with event metadata, budget, preference, and member summary.

### `PATCH /api/events/[id]`
- **Auth**: `EVENT_MANAGE` (Owner only)
- **Body**: Event update fields.

### `DELETE /api/events/[id]`
- **Auth**: `EVENT_MANAGE` (Owner only)
- **Response**: `200 OK` (cascading deletion of all event resources).

---

## 3. AI Event Architect Endpoints

### `GET /api/events/[id]/ai-architect`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` with latest approved 12-section master brief.

### `POST /api/events/[id]/ai-architect`
- **Auth**: `EVENT_EDIT`
- **Body**: `{ "style": "...", "indoorOutdoor": "OUTDOOR", "specialInstructions": "..." }`
- **Response**: `200 OK` with generated 12-section master plan.

### `PATCH /api/events/[id]/ai-architect`
- **Auth**: `EVENT_EDIT`
- **Body**: `{ "sectionName": "menuSuggestions", "instructions": "More vegan items" }`
- **Response**: `200 OK` (regenerates individual section preserving other edits).

### `POST /api/events/[id]/ai-architect/approve`
- **Auth**: `EVENT_EDIT`
- **Body**: `{ "generationId": "...", "approvedPlan": { ... } }`
- **Response**: `200 OK` (commits plan to relational Category, Expense, Milestone, and Task models).

### `POST /api/events/[id]/ai-architect/feedback`
- **Auth**: `EVENT_VIEW`
- **Body**: `{ "generationId": "...", "rating": 5, "feedbackComment": "..." }`
- **Response**: `200 OK`

---

## 4. Financial & Budget Endpoints

### `GET /api/events/[id]/budgets`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` with total budget, allocated, actual paid, pending, remaining contingency, category breakdown, and alerts.

### `POST /api/events/[id]/budgets/expenses`
- **Auth**: `BUDGET_MANAGE`
- **Body**:
  ```json
  {
    "categoryId": "...",
    "title": "Floral Installation",
    "baseAmountMinor": 250000,
    "taxBasisPoints": 825,
    "notes": "Invoice #492"
  }
  ```
- **Response**: `201 Created`

### `PATCH /api/events/[id]/budgets/expenses/[expenseId]`
- **Auth**: `BUDGET_MANAGE`
- **Body**: Updated amounts or category ID.

### `POST /api/events/[id]/budgets/payments`
- **Auth**: `BUDGET_MANAGE`
- **Body**:
  ```json
  {
    "expenseId": "...",
    "amountMinor": 100000,
    "paymentMethod": "BANK_TRANSFER",
    "isRefund": false
  }
  ```
- **Response**: `200 OK` (synchronizes expense status: `PARTIAL` / `PAID`).

### `POST /api/events/[id]/budgets/simulate-guests`
- **Auth**: `EVENT_VIEW`
- **Body**: `{ "newGuestCount": 180 }`
- **Response**: `200 OK` with simulated expenditure and variance calculations.

### `GET /api/events/[id]/budgets/export`
- **Auth**: `REPORT_EXPORT`
- **Response**: `200 OK` (CSV stream with itemized financial records).

---

## 5. Timeline, Tasks & Itinerary Endpoints

### `GET /api/events/[id]/timeline`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` with tasks, milestones, and itinerary slots.

### `POST /api/events/[id]/timeline/tasks`
- **Auth**: `TIMELINE_MANAGE`
- **Body**: `{ "title": "...", "dueDate": "...", "priority": "HIGH", "isMilestone": true }`
- **Response**: `201 Created`

### `PATCH /api/events/[id]/timeline/tasks/[taskId]`
- **Auth**: `TIMELINE_MANAGE`
- **Body**: `{ "status": "IN_PROGRESS" }`
- **Response**: `200 OK`

### `POST /api/events/[id]/timeline/generate`
- **Auth**: `TIMELINE_MANAGE`
- **Response**: `200 OK` (calibrates timeline relative to event date while preserving manual tasks).

### `POST /api/events/[id]/timeline/dependencies`
- **Auth**: `TIMELINE_MANAGE`
- **Body**: `{ "taskId": "...", "dependsOnTaskId": "..." }`
- **Response**: `200 OK` (rejects with 400 if circular cycle detected via DFS).

---

## 6. Vendor & Quotation Comparison Endpoints

### `GET /api/events/[id]/vendors`
- **Auth**: `EVENT_VIEW`
- **Query**: `categoryId` (optional filter)
- **Response**: `200 OK` with registered vendors, workflow statuses, quotes, and categories.

### `POST /api/events/[id]/vendors`
- **Auth**: `VENDOR_MANAGE`
- **Body**: Vendor profile with contact info, estimated price, rating, and source tag (`USER_ENTERED`).

### `PATCH /api/events/[id]/vendors/[vendorId]`
- **Auth**: `VENDOR_MANAGE`
- **Body**: `{ "bookingStatus": "CONTACTED" }` (advances state machine).

### `POST /api/events/[id]/vendors/[vendorId]/quotes`
- **Auth**: `VENDOR_MANAGE`
- **Body**: `{ "title": "...", "basePriceMinor": 300000, "additionalFeesMinor": 25000, "servicesIncluded": "..." }`
- **Response**: `201 Created`

### `POST /api/events/[id]/vendors/[vendorId]/bookings`
- **Auth**: `VENDOR_MANAGE`
- **Body**: Confirms contract and creates corresponding Expense in Budget ledger.

---

## 7. Guest Manifest & Public Tokenized RSVP Endpoints

### `GET /api/events/[id]/guests`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` (masks contact PII for `VIEWER` roles; includes seating and headcount metrics).

### `POST /api/events/[id]/guests`
- **Auth**: `GUEST_MANAGE`
- **Body**: Guest registration with duplicate prevention by name/email. Generates `CELEB-XXXX` token.

### `POST /api/events/[id]/guests/import`
- **Auth**: `GUEST_MANAGE`
- **Body**: Raw CSV content or JSON `{ "csvText": "..." }`
- **Response**: `200 OK` with imported count, skipped duplicates count, and error lines.

### `PATCH /api/events/[id]/guests/[guestId]`
- **Auth**: `GUEST_MANAGE`
- **Body**: Guest update fields.

### `POST /api/events/[id]/guests/[guestId]/check-in`
- **Auth**: `GUEST_MANAGE`
- **Body**: `{ "checkedIn": true }`
- **Response**: `200 OK`

### `POST /api/events/[id]/guests/[guestId]/invitation`
- **Auth**: `GUEST_MANAGE`
- **Body**: `{ "action": "generate", "tone": "CELEBRATORY" }` or `{ "action": "dispatch", "channel": "EMAIL" }`
- **Response**: `200 OK` (truth-in-delivery reports `PROVIDER_UNCONFIGURED` when gateway not connected).

### `GET /api/rsvp/[code]`
- **Auth**: Public (Rate-limited: 120/min)
- **Response**: `200 OK` with isolated celebration details (title, date, venue) and guest name.

### `POST /api/rsvp/[code]`
- **Auth**: Public (Rate-limited: 120/min)
- **Body**:
  ```json
  {
    "rsvpStatus": "ATTENDING",
    "attendingCount": 2,
    "dietaryRequirements": "Vegetarian",
    "accessibilityNotes": "Wheelchair access"
  }
  ```
- **Response**: `200 OK` with personalized confirmation message.

---

## 8. ISO 31000 Risk Register Endpoints

### `GET /api/events/[id]/risks`
- **Auth**: `EVENT_VIEW`
- **Response**: `200 OK` with 5x5 RAG severity metrics, category breakdown, and mitigations.

### `POST /api/events/[id]/risks`
- **Auth**: `RISK_MANAGE`
- **Body**: `{ "title": "...", "category": "...", "probability": 4, "impact": 5, "mitigationPlan": "...", "contingencyPlan": "..." }`
- **Response**: `201 Created`

### `PATCH /api/events/[id]/risks/[riskId]`
- **Auth**: `RISK_MANAGE`
- **Body**: Recalculates 5x5 severity score and updates status (`IDENTIFIED`, `MITIGATED`, `ACCEPTED`, `CLOSED`).

### `POST /api/events/[id]/risks/generate`
- **Auth**: `RISK_MANAGE`
- **Response**: `200 OK` (seeds baseline risks tailored to venue type and event category).

---

## 9. Diagnostics & System Health

### `GET /api/health`
- **Auth**: Public
- **Response**: `200 OK` with database connection check, memory utilization, environment status, and crypto check.
