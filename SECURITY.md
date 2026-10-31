# MOMENTIQ — Security Architecture & Threat Model
### OWASP ASVS Level 2 Verification & Cryptographic Standards

---

## 1. Security Overview & Compliance Target

MOMENTIQ implements a defense-in-depth security model targeting **100/100 defensible compliance** with the **OWASP Application Security Verification Standard (ASVS) Level 2**.

Key security guarantees:
- **No Insecure Direct Object References (IDOR)**: Validated on every single protected API call.
- **Timing-Safe Cryptography**: Constant-time key comparison preventing timing side-channel attacks.
- **Fail-Closed Configuration**: Rejection of production traffic if critical security secrets are absent.
- **Prompt Injection Defense**: Boundary tagging and adversarial payload filtering.
- **PII Data Minimization**: Masked contact data for non-administrative roles.

---

## 2. Authentication & Cryptographic Engineering

### A. Password Storage (RFC 7914 Scrypt)
Passwords are never stored in plaintext. MOMENTIQ uses the memory-hard **Scrypt** key derivation function via Node.js native `crypto.scrypt`:
- **Parameters**:
  - CPU/Memory Cost ($N$): $16384$
  - Block Size ($r$): $8$
  - Parallelization ($p$): $1$
  - Derived Key Length: $64$ bytes ($512$ bits)
  - Salt: Cryptographically random 16-byte salt via `crypto.randomBytes(16)`
- **Format**: `salt:derivedKeyHex`

### B. Timing-Safe Key Comparison
To defend against microsecond-level timing attacks during authentication, password hash comparisons strictly utilize `crypto.timingSafeEqual`:
```typescript
const isMatch = crypto.timingSafeEqual(
  Buffer.from(storedHash, 'hex'),
  Buffer.from(candidateHash, 'hex')
);
```

### C. Session Integrity (HMAC-SHA256)
- **Token Format**: `userId.timestamp.nonce.signature`
- **Signature**: Generated via `crypto.createHmac('sha256', secret)`
- **Fail-Closed Production Check**:
  In `NODE_ENV === 'production'`, the server verifies `SESSION_SECRET` is not default or shorter than 32 characters, throwing a fatal startup error if misconfigured.

---

## 3. Multi-Tenant Authorization & IDOR Defense

In a celebration platform, sensitive personal information (guest phone numbers, guest family relationships, vendor pricing contracts, budgets) must remain completely isolated between independent hosts.

### A. Server-Side Guard: `authorizeEventAccess`
Every API endpoint handling event resources invokes:
```typescript
const access = await authorizeEventAccess(userId, eventId, requiredPermission);
```

### B. Role-Based Permissions Matrix
| Permission | OWNER | PLANNER | COLLABORATOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| `EVENT_MANAGE` (Delete/Archive) | ✅ | ❌ | ❌ | ❌ |
| `MEMBER_MANAGE` (Add/Remove Team) | ✅ | ❌ | ❌ | ❌ |
| `BUDGET_MANAGE` (Expenses/Payments) | ✅ | ✅ | ❌ | ❌ |
| `VENDOR_MANAGE` (Contracts/Quotes) | ✅ | ✅ | ❌ | ❌ |
| `RISK_MANAGE` (Risk Matrix/Mitigations) | ✅ | ✅ | ❌ | ❌ |
| `TIMELINE_MANAGE` (Tasks/Kanban) | ✅ | ✅ | ✅ | ❌ |
| `GUEST_MANAGE` (Add/Import/Check-in) | ✅ | ✅ | ✅ | ❌ |
| `EVENT_VIEW` (Read Workspace) | ✅ | ✅ | ✅ | ✅ |

### C. Empirical IDOR Verification
Demonstrated by `tests/events-and-idor.test.ts`:
- User A creates Event A.
- User B (authenticated, independent user) attempts to:
  - Read Event A data &rarr; **403 Forbidden**
  - Update Event A title &rarr; **403 Forbidden**
  - Delete Event A &rarr; **403 Forbidden**
  - Add expenses to Event A &rarr; **403 Forbidden**
  - Check in guests on Event A &rarr; **403 Forbidden**

---

## 4. AI Security & Prompt Injection Defenses

AI Event Architect accepts rich natural language briefs from users. Adversarial actors may attempt to inject malicious system instructions or exfiltrate environment secrets.

### A. Defense-in-Depth Pipeline ([sanitizer.ts](file:///e:/Celebria_Event_Planner/src/lib/ai/sanitizer.ts))
1. **Zero-Width & Invisible Character Stripping**:
   Removes zero-width joiners (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`) used by attackers to hide malicious keywords from regex filters.
2. **Adversarial Delimiter Encapsulation**:
   All untrusted user briefs are isolated within explicit non-reproducible XML-style boundary markers:
   ```text
   <<<UNTRUSTED_EVENT_BRIEF>>>
   [Sanitized User Input]
   <<<END_UNTRUSTED_EVENT_BRIEF>>>
   ```
   System instructions explicitly instruct the model that content inside these tags is **data only**, never instructions.
3. **Keyword & Jailbreak Pattern Detection**:
   Inspects for patterns such as:
   - `/ignore\s+(previous|all)\s+instructions/i`
   - `/reveal\s+(your\s+|the\s+)?(system\s+prompt|instructions|secret)/i`
   - `/system\s*:/i`
   - `/DAN\s+mode/i`
4. **Token Bounds & Request Timeouts**:
   Prompts are clamped to maximum length bounds; API calls time out deterministically after 25 seconds.
5. **No AI Write Permissions**:
   AI outputs are generated strictly as structured schemas validated with Zod. The AI service **never executes database writes directly**.

---

## 5. Rate Limiting & Denial of Service Defenses

### Sliding-Window Limiter ([rate-limiter.ts](file:///e:/Celebria_Event_Planner/src/lib/security/rate-limiter.ts))
- **Authentication Endpoints** (`/api/auth/*`): 10 requests per minute per IP.
- **Public RSVP Endpoints** (`/api/rsvp/*`): 120 requests per minute per IP.
- **Automatic Cleanup**: Stale timestamps are purged automatically to prevent memory leaks.

---

## 6. PII Minimization & Privacy

Under GDPR and privacy best practices, collaborators who only need operational overview should not be granted access to private guest emails and phone numbers.

In `GuestService.listGuests`:
- When accessed by an `OWNER` or `PLANNER`, full contact records are returned.
- When accessed by a `VIEWER`, PII is masked:
  - `bruce.wayne@wayneenterprises.com` &rarr; `br***@wayneenterprises.com`
  - `+1-555-888-0001` &rarr; `+1-****01`

