import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CELEBRA WCAG 2.2 AA Automated Accessibility Audit', () => {
  test('1. Landing page conforms to WCAG 2.2 AA standards via AxeBuilder', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2. Authentication screens (Login & Register) conform to WCAG 2.2 AA', async ({ page }) => {
    // Login
    await page.goto('/login');
    const loginScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(loginScan.violations).toEqual([]);

    // Register
    await page.goto('/register');
    const registerScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(registerScan.violations).toEqual([]);
  });

  test('3. Event Creation Wizard conforms to accessible forms & semantic structure', async ({ page }) => {
    // Register temporary user to access protected wizard
    const timestamp = Date.now();
    await page.goto('/register');
    await page.fill('#reg-name', 'A11y Auditor');
    await page.fill('#reg-email', `a11y_${timestamp}@test.com`);
    await page.fill('#reg-password', 'AuditorPass123!');
    await page.fill('#reg-confirm-password', 'AuditorPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Scan Dashboard
    const dashboardScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(dashboardScan.violations).toEqual([]);

    // Scan Event Wizard
    await page.goto('/events/new');
    const wizardScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(wizardScan.violations).toEqual([]);
  });
});

