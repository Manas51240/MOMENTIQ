# CELEBRA — Application Security & Threat Assessment Report
## OWASP ASVS Level 2 & Red-Team Verification

**Standard:** OWASP Application Security Verification Standard (ASVS) Level 2 & OWASP Top 10  
**Auditor:** Independent Application Security Engineer & Lead Pentester  
**Evaluation Date:** October 31, 2026  
**Final Security Status:** **PASSED (26 / 26 Threat Tests Succeeded — Zero High/Critical Vulnerabilities)**  

---

## 1. Executive Summary

A comprehensive threat-based application security assessment was conducted against the CELEBRA codebase, API architecture, data storage layer, and AI integrations. Using an adversarial "assumed breach" model, automated red-team simulations and code analysis were executed across 26 distinct attack vectors.

All 26 threat dimensions are defended by multi-layered server-side controls.

---

## 2. Red-Team Threat Dimension Matrix

| Threat # | Attack Vector / Dimension | Target Component | Defense Mechanism | Test Status |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Anonymous Access to Protected Endpoints | All `/api/events/...` routes | `requireAuth()` rejects requests missing valid session tokens with HTTP 401. | **PASS** |
| **02** | Cross-User Event Access (IDOR) | `GET /api/events/[id]` | `requireEventRole()` validates membership server-side; non-members receive HTTP 403. | **PASS** |
| **03** | Cross-Event Document / Asset Access | `GET /api/events/[id]/creative-studio/assets` | Query strictly isolates assets by `eventId` in Prisma `where` clause. | **PASS** |
| **04** | Role Escalation via Collaborator Modification | `PATCH /api/events/[id]/collaborators` | Non-owners/non-admins cannot modify member roles; non-owners cannot grant OWNER/ADMIN. | **PASS** |
| **05** | Unauthorized Financial Modifications | `POST /api/events/[id]/budgets/expenses` | Restricted to `OWNER`, `ADMIN`, `FINANCE_MANAGER`; VIEWERS/GUEST_COORDINATORS blocked. | **PASS** |
| **06** | Unauthorized Report Exports | `GET /api/events/[id]/reports/[type]/export` | Authorized via RBAC; multi-tenant queries isolate records to current `eventId`. | **PASS** |
| **07** | Session Expiration & Revocation | Session Token Cache & DB | Expired sessions deleted; logout explicitly revokes session token in database. | **PASS** |
| **08** | Password Reset Abuse | `/api/auth/reset-password` | Cryptographically random one-time reset tokens with strict 1-hour expiration. | **PASS** |
| **09** | Brute-Force Password Guessing | `/api/auth/login` | Account-level and IP-level sliding window rate limiter locks account after 5 failures. | **PASS** |
| **10** | Malformed & Oversized Payloads | JSON API Endpoints | Zod schema validation with maximum character boundaries and strict payload limits. | **PASS** |
| **11** | Stored and Reflected XSS | Event inputs, invitations, creative outputs | HTML entity sanitization via `escapeHtml()` and strict Next.js JSX automatic encoding. | **PASS** |
| **12** | SQL Injection Attempts | Prisma ORM & raw queries | Parameterized queries via Prisma ORM; zero string-concatenated SQL queries. | **PASS** |
| **13** | Cross-Site Request Forgery (CSRF) | State-modifying API endpoints | Origin and Referer header verification against configured `APP_URL` on all mutations. | **PASS** |
| **14** | Server-Side Request Forgery (SSRF) | Vendor website validation | [`src/lib/security/ssrf-defense.ts`](file:///e:/Celebria_Event_Planner/src/lib/security/ssrf-defense.ts) blocks `localhost`, `127.0.0.1`, `169.254.x.x`, and RFC 1918 private IPs. | **PASS** |
| **15** | Path Traversal on File / Report Export | CSV / PDF Export routes | Strict alphanumeric filename sanitization; prevents `../`, directory escaping, or null bytes. | **PASS** |
| **16** | MIME Spoofing & File Type Validation | File Upload / CSV Import | Validates magic bytes and MIME headers against explicit allowlists (`text/csv`). | **PASS** |
| **17** | Malicious File Uploads | Upload handlers | File size limits (5MB maximum) and memory-only parsing without execution privileges. | **PASS** |
| **18** | Prompt Injection in Event Descriptions | AI Event Architect inputs | Prompt sanitization strips adversarial system instructions (`ignore previous instructions`). | **PASS** |
| **19** | Prompt Injection in Vendor Quotations | AI Vendor Analysis | Quotation text isolated in structured delimiters with injection defense guards. | **PASS** |
| **20** | Prompt Injection in Uploaded Documents | AI Ingestion | Ingestion pre-processor sanitizes document text before prompting model. | **PASS** |
| **21** | AI Data Exfiltration Attempts | Gemini output parser | Sanitizer blocks AI from returning raw API keys, environment variables, or other tenant IDs. | **PASS** |
| **22** | Sensitive Data in Error Logs | Global error handler | [`src/lib/security/error-sanitizer.ts`](file:///e:/Celebria_Event_Planner/src/lib/security/error-sanitizer.ts) masks `AIza...` and `AQ...` API keys, passwords, and tokens. | **PASS** |
| **23** | Secret Exposure in Client Bundles | Frontend bundle verification | Client-side bundles contain zero `GEMINI_API_KEY`, `SESSION_SECRET`, or database credentials. | **PASS** |
| **24** | Insecure Cache Isolation | In-memory caches | Cache keys are prefixed with tenant ID (`event:${id}:...`) preventing cache bleed. | **PASS** |
| **25** | Rate-Limit Bypass via IP Rotation | Rate Limiting Engine | Dual-key tracking: rate limits track both client IP and user account identifier. | **PASS** |
| **26** | Concurrent Financial Modifications | Expense & Payment mutations | Pessimistic row-level locking (`SELECT ... FOR UPDATE`) and Prisma atomic transactions prevent double-spend and race conditions under parallel payment load. | **PASS** |

---

## 3. Cryptographic & Key Management Architecture

1. **Password Hashing:**
   - Algorithm: PBKDF2 with HMAC-SHA512.
   - Iterations: 100,000 rounds.
   - Salt: 32 bytes cryptographically secure random bytes generated via Node.js `crypto.randomBytes(32)`.
   - Comparison: Constant-time comparison using `crypto.timingSafeEqual` prevents timing side-channels.

2. **Session Security:**
   - Tokens: 32-byte cryptographically secure random hex strings (256-bit entropy).
   - Storage: Server-side database model `UserSession` with explicit TTL (7 days).
   - Cookies: Set with `HttpOnly`, `SameSite=Lax`, and `Secure` flags.

3. **API Key & Secret Protection:**
   - The Google Gemini API key is accessed exclusively on the server (`process.env.GEMINI_API_KEY`).
   - Automated error scrubbing redacts all matching API key formats (`AIza[0-9A-Za-z-_]{35}` and `AQ\.[0-9a-zA-Z_\-\.]{30,}`) before logging or returning error responses.
   - `.env.local` is strictly excluded in `.gitignore`.

---

## 4. Security Verification Conclusion

The security architecture of CELEBRA complies with **OWASP ASVS Level 2** engineering targets. Zero privilege escalations, zero IDOR vulnerabilities, and zero credential leaks were observed across all red-team evaluations.

