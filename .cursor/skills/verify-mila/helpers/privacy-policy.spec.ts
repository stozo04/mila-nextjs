import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = process.env.EVIDENCE_DIR || '/tmp/verify-mila/evidence';
const FEATURE_ID = 'privacy-policy';
const BASE_URL = 'http://localhost:3010';

test.describe('Privacy Policy Page', () => {
  test('displays privacy policy content', async ({ page }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Set up console log capture
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Step 1: Navigate to privacy policy page
    await page.goto(`${BASE_URL}/privacy-policy`);
    await page.waitForLoadState('networkidle');
    
    // Verify URL
    await expect(page).toHaveURL(/\/privacy-policy/);
    
    // Screenshot 1: Initial page load
    await page.screenshot({ 
      path: path.join(EVIDENCE_DIR, 'screenshots', `${FEATURE_ID}-top-${timestamp}.png`),
      fullPage: false 
    });

    // Step 2: Verify page title
    const heading = page.locator('h1:has-text("Privacy Policy")');
    await expect(heading).toBeVisible();

    // Step 3: Check last updated date
    const updatedText = page.locator('text=/Last updated:/');
    await expect(updatedText).toBeVisible();

    // Step 4: Verify key sections exist
    const sections = [
      'Who We Are',
      'Information We Collect',
      'How We Use Information',
      'How We Share Information',
      'Data Retention and Deletion',
      'Contact Us'
    ];
    
    for (const section of sections) {
      const sectionHeading = page.locator(`h2:has-text("${section}")`);
      await expect(sectionHeading).toBeVisible();
    }

    // Step 5: Check email contact link exists (multiple instances on page)
    const emailLink = page.locator('a[href="mailto:privacy@milarosegates.com"]').first();
    await expect(emailLink).toBeVisible();
    
    // Scroll to middle section for screenshot
    await page.locator('h2:has-text("Information We Collect")').scrollIntoViewIfNeeded();
    await page.screenshot({ 
      path: path.join(EVIDENCE_DIR, 'screenshots', `${FEATURE_ID}-mid-${timestamp}.png`),
      fullPage: false 
    });

    // Scroll to bottom for screenshot
    await page.locator('h2:has-text("Contact Us")').scrollIntoViewIfNeeded();
    await page.screenshot({ 
      path: path.join(EVIDENCE_DIR, 'screenshots', `${FEATURE_ID}-bottom-${timestamp}.png`),
      fullPage: false 
    });

    // Step 6: Verify scrollable content
    const contentHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(contentHeight).toBeGreaterThan(1000);

    // Capture ARIA snapshot
    const ariaSnapshot = await page.ariaSnapshot();
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'aria-snapshots', `${FEATURE_ID}-${timestamp}.txt`),
      ariaSnapshot
    );

    // Save console logs
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'console-logs', `${FEATURE_ID}-${timestamp}.txt`),
      consoleLogs.join('\n')
    );

    console.log(`✓ Evidence captured for ${FEATURE_ID}`);
  });
});
