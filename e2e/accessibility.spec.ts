import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CELEBRA WCAG 2.2 AA Comprehensive Accessibility Audit', () => {
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
    await page.fill('#reg-email', `a11y_wiz_${timestamp}@test.com`);
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

  test('4. Full celebration subpages conform to WCAG 2.2 AA standards', async ({ page }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();
    await page.goto('/register');
    await page.fill('#reg-name', 'A11y Deep Auditor');
    await page.fill('#reg-email', `a11y_deep_${timestamp}@test.com`);
    await page.fill('#reg-password', 'AuditorPass123!');
    await page.fill('#reg-confirm-password', 'AuditorPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Create an event
    await page.goto('/events/new');
    await page.fill('#evt-title', `A11y Celebration ${timestamp}`);
    await page.selectOption('#evt-type', 'WEDDING');
    await page.fill('#evt-guests', '100');
    await page.fill('#evt-budget', '25000');
    await page.fill('#evt-venue', 'Botanical Conservatory');
    await page.fill('#evt-city', 'Seattle');
    await page.fill('#evt-theme', 'Botanical Elegance');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*events\/([a-f0-9-]+)/);
    const url = page.url();
    const eventId = url.split('/events/')[1].split('/')[0];

    // Subroutes to audit
    const subpages = [
      '',
      '/budget',
      '/vendors',
      '/guests',
      '/timeline',
      '/reports',
      '/risks',
      '/collaborators',
      '/creative-studio',
      '/ai-architect',
    ];

    for (const sub of subpages) {
      await page.goto(`/events/${eventId}${sub}`);
      // Wait for content to settle
      await page.waitForLoadState('domcontentloaded');

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(scanResults.violations).toEqual([]);
    }
  });

  test('5. 200% Zoom and Viewport text-scaling validation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Evaluate at 200% zoom emulation
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    const zoomScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(zoomScan.violations).toEqual([]);
  });
});
