# MOMENTIQ — Accessibility Verification Dossier (WCAG 2.2 AA)

This document certifies that MOMENTIQ has been designed and implemented in strict conformance with the **Web Content Accessibility Guidelines (WCAG) 2.2 Level AA**.

---

## 1. Executive Summary & Verification Matrix

| WCAG 2.2 AA Principle | Guideline / Criterion | Status | Implementation Details |
| :--- | :--- | :--- | :--- |
| **1. Perceivable** | 1.1.1 Non-text Content | **PASS** | Charts, SVG telemetry previews, and moodboards include descriptive `aria-label` tags and visually hidden summaries (`.sr-only`). |
| | 1.3.1 Info & Relationships | **PASS** | Semantic HTML5 landmarks (`<nav>`, `<header>`, `<main id="main-content">`), 1 `<h1>` per view, proper heading hierarchies, and table header column bindings (`<th scope="col">`). |
| | 1.4.1 Use of Color | **PASS** | All status badges, risk categories, and workflow steps pair color with distinctive icons and explicit textual labels; never relying on color alone. |
| | 1.4.3 Contrast (Minimum) | **PASS** | High-contrast palette: Body text meets >= 4.5:1; UI controls and large headings meet >= 3:1 contrast against surface containers. |
| **2. Operable** | 2.1.1 Keyboard Navigation | **PASS** | Every interactive element is fully operable via keyboard with logical tab ordering. Top-level `<SkipToContent />` bypass link at the top of the DOM. |
| | 2.1.2 No Keyboard Trap | **PASS** | All dialog modals implement cycle-safe focus traps with `Escape` key dismissal and focus restoration to the opening trigger element. |
| | 2.3.3 Animation from Interactions | **PASS** | Animations respect user OS preferences via `prefers-reduced-motion: reduce`. |
| | 2.4.7 Focus Visible | **PASS** | High-contrast `:focus-visible` ring styling with 2px offset on all buttons, links, dropdowns, and form inputs. |
| **3. Understandable** | 3.2.1 On Focus | **PASS** | No unexpected context changes or auto-submissions upon receiving focus. |
| | 3.3.1 Error Identification | **PASS** | Form validation errors provide `role="alert"`, descriptive messages, and `aria-invalid` bindings. |
| **4. Robust** | 4.1.2 Name, Role, Value | **PASS** | Interactive controls use explicit ARIA attributes: `aria-modal="true"`, `role="dialog"`, `aria-labelledby`, and `aria-expanded`. |
| | 4.1.3 Status Messages | **PASS** | Dynamic recalculations, AI generation feedback, and toasts broadcast via `aria-live="polite"` announcement regions. |

---

## 2. Component Conformance Details

### 2.1 Modal Dialogs (`src/components/ui/Modal.tsx`)
1. Proper WAI-ARIA modal attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
2. **Cycle-safe Focus Trap**: Tab and Shift+Tab navigate focus strictly within modal bounds.
3. **Focus Restoration**: Returns keyboard focus to the button that triggered the modal upon closure.
4. **Escape Key Dismissal**: Listens to standard `Escape` keydown events.

### 2.2 Screen-Reader Compatibility & Data Tables
- All SVG previews in the AI Creative Studio and Financial Ledger are paired with accessible text representations.
- Tables (`ExpenseTable`, `CategoryBreakdownTable`, `VendorComparisonTable`) implement strict column scopes (`scope="col"`).

### 2.3 High Contrast & Dark Mode Ergonomics
- Amber accent palette `#78350f` (amber-900) and stone `#1c1917` (stone-900) ensure AAA compliance across all light surfaces.

