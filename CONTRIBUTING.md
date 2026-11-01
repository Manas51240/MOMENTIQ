# Contributing to MOMENTIQ

Thank you for your interest in contributing to **MOMENTIQ — Intelligent Event Planning & Celebration Platform**!

## Code Quality Standards

All contributions must adhere to the highest engineering and code quality standards:

1. **Strict TypeScript (5.7+)**:
   - Zero compilation errors (`npm run typecheck`).
   - No explicit `any` types. All domain models, interfaces, and function signatures must be strictly typed.
   - Use `Record<string, unknown>` or typed generics for dynamic dictionaries.

2. **Zero Floating-Point Financials**:
   - All monetary calculations must use 64-bit integer minor currency units (`BigInt`) to prevent IEEE 754 precision loss.
   - Tax calculations use basis points (1 bps = 0.01%).

3. **Deterministic AI Architecture**:
   - Every generative AI interaction must be backed by a deterministic, offline-safe fallback engine with strict Zod schema validation.
   - Enforce Truth-in-Delivery: Never fabricate fake external status or data.

4. **Security & Data Isolation (OWASP ASVS Level 2)**:
   - All tenant-scoped operations must pass through `authorizeEventAccess` to prevent Insecure Direct Object References (IDOR).
   - All external prompts must pass through prompt-injection sanitization (`wrapUntrustedEventBrief`).
   - Passwords must be hashed using Scrypt (RFC 7914) with cryptographically secure salts.

5. **Accessibility (WCAG 2.2 AA)**:
   - High contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text).
   - Full keyboard navigation and visible focus rings.
   - ARIA live announcements for dynamic async updates.

6. **Testing & Verification**:
   - Comprehensive unit and integration test coverage (`npm test`).
   - High-throughput algorithmic benchmarks (`npm run bench`).
   - Production build validation (`npm run build`).

## Workflow

1. Fork the repository and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Commit your changes with conventional commit messages: `git commit -m 'feat: add amazing feature'`.
3. Verify all quality gates pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run bench
   npm test
   ```
4. Push to your branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request with a clear description of changes.
