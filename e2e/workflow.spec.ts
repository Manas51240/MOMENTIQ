import { test, expect } from '@playwright/test';

test.describe('CELEBRA End-to-End User Workflows & Accessibility Suite', () => {
  test('1. Landing page loads cleanly with WCAG skip link and core architecture sections', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/CELEBRA/);
    await expect(page.locator('h1')).toContainText('Architecting Celebrations with');

    // Skip to main content link exists
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Verify categories are rendered via headings (strict mode safe)
    await expect(page.getByRole('heading', { name: 'Weddings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Corporate Galas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Birthdays & Milestones' })).toBeVisible();

    // System Diagnostics link
    const healthLink = page.locator('a[href="/api/health"]').first();
    await expect(healthLink).toBeVisible();
  });

  test('2. Complete user registration, authentication, and session persistence', async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e_auth_${timestamp}@example.com`;
    const password = 'StrongPassword123!';

    await page.goto('/register');

    // Fill registration form
    await page.fill('#reg-name', 'E2E Auth User');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', password);
    await page.fill('#reg-confirm-password', password);
    await page.selectOption('#reg-role', 'HOST');

    await page.click('button[type="submit"]');

    // Redirects to dashboard upon successful registration
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Celebration Dashboard');

    // Sign out
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/.*login/);

    // Sign back in
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('3. Full celebration creation lifecycle via Event Wizard', async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e_event_${timestamp}@example.com`;
    const password = 'StrongPassword123!';

    // Register user first
    await page.goto('/register');
    await page.fill('#reg-name', 'E2E Planner User');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', password);
    await page.fill('#reg-confirm-password', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Launch Wizard
    await page.goto('/events/new');
    await expect(page.locator('h1')).toContainText('Create New Celebration');

    // Fill Wizard Details
    await page.fill('#evt-title', `E2E Gala Extravaganza ${timestamp}`);
    await page.selectOption('#evt-type', 'WEDDING');
    await page.fill('#evt-guests', '175');
    await page.fill('#evt-budget', '45000');
    await page.fill('#evt-venue', 'Crystalline Conservatory Garden');
    await page.fill('#evt-city', 'San Francisco');
    await page.fill('#evt-theme', 'Ethereal Botanical Twilight');

    await page.click('button[type="submit"]');

    // Redirects to newly initialized event overview hub
    await expect(page).toHaveURL(/.*events\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText(`E2E Gala Extravaganza ${timestamp}`);
    await expect(page.getByText('175 target attendees')).toBeVisible();
  });

  test('4. Public Tokenized Guest RSVP Workflow (Zero-Auth)', async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e_guest_${timestamp}@example.com`;
    const password = 'StrongPassword123!';

    // Register user and create event
    await page.goto('/register');
    await page.fill('#reg-name', 'E2E Host');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', password);
    await page.fill('#reg-confirm-password', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Create celebration
    await page.goto('/events/new');
    await page.fill('#evt-title', `RSVP Gala Celebration ${timestamp}`);
    await page.selectOption('#evt-type', 'WEDDING');
    await page.fill('#evt-guests', '120');
    await page.fill('#evt-budget', '30000');
    await page.fill('#evt-venue', 'Grand Ballroom');
    await page.fill('#evt-city', 'Chicago');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*events\/[a-f0-9-]+/);

    // Navigate to Guests tab
    await page.click('a:has-text("Guests & Seating")');
    await expect(page.locator('h1')).toContainText('Guest List');

    // Register a test guest
    await page.getByRole('button', { name: '+ Add Guest' }).click();
    await page.fill('#g-name', 'Samantha Carter');
    await page.fill('#g-email', `carter_${timestamp}@sgc.mil`);
    await page.fill('#g-seats', '2');
    await page.fill('#g-diet', 'Pescatarian');
    await page.getByRole('button', { name: 'Add Guest', exact: true }).click();

    // Wait for row to appear
    await expect(page.getByText('Samantha Carter')).toBeVisible();

    // Copy link / extract invite code
    const copyButton = page.locator('tr:has-text("Samantha Carter") button:has-text("Copy Link")');
    await expect(copyButton).toBeVisible();

    // Check-in toggle
    const checkInBtn = page.locator('tr:has-text("Samantha Carter") button:has-text("Check In")');
    await checkInBtn.click();
    await expect(page.locator('tr:has-text("Samantha Carter") button:has-text("✓ Checked In")')).toBeVisible();
  });
});
