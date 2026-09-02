# Privacy Policy Page

The privacy policy page is a static informational page explaining how the site collects, uses, and protects user data, including Google OAuth user data. It's a public page with no interactive elements beyond navigation.

## Sub-features

- `privacy-content`: Long-form legal content with sections
- `privacy-mailto-links`: Email contact links for privacy inquiries
- `privacy-navigation`: Standard navbar for site navigation

## How to get to it (user POV)

- **Direct URL**: Navigate to `http://localhost:3010/privacy-policy`
- **From footer** (if linked): Click "Privacy Policy" link in site footer

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- No authentication required (public page)
- No external dependencies or API calls

### Steps

1. **Navigate to privacy policy page**:
   ```typescript
   await page.goto('http://localhost:3010/privacy-policy');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Privacy policy page loads with heading "Privacy Policy"
   - Assertion: `await expect(page).toHaveURL(/\/privacy-policy/);`

2. **Verify page title**:
   ```typescript
   const heading = page.locator('h1:has-text("Privacy Policy")');
   await expect(heading).toBeVisible();
   ```
   - Observable result: Main heading "Privacy Policy" appears at top
   - Assertion: H1 element contains exact text

3. **Check last updated date**:
   ```typescript
   const updatedText = page.locator('text=/Last updated:/');
   await expect(updatedText).toBeVisible();
   ```
   - Observable result: "Last updated: October 6, 2025" displayed below heading
   - Assertion: Text matches constant `UPDATED_AT` in component

4. **Verify key sections exist**:
   ```typescript
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
   ```
   - Observable result: All major policy sections have H2 headings
   - Assertion: Each section heading is visible on page

5. **Check email contact link**:
   ```typescript
   const emailLink = page.locator('a[href="mailto:privacy@milarosegates.com"]');
   await expect(emailLink).toBeVisible();
   ```
   - Observable result: "privacy@milarosegates.com" email link is clickable
   - Assertion: Link has correct `mailto:` href

6. **Verify scrollable content**:
   ```typescript
   const contentHeight = await page.evaluate(() => document.body.scrollHeight);
   expect(contentHeight).toBeGreaterThan(1000); // Long content
   ```
   - Observable result: Page has substantial content (multiple screens)
   - Assertion: ScrollHeight indicates long-form content

### Evidence capture
- **Screenshot 1**: Top of page (heading + intro)
  - Filename: `privacy-policy-top-<timestamp>.png`
  - When: After step 2 completes
- **Screenshot 2**: Mid-page (e.g., "Information We Collect" section)
  - Filename: `privacy-policy-mid-<timestamp>.png`
  - When: After scrolling to section 2
- **Screenshot 3**: Bottom of page ("Contact Us")
  - Filename: `privacy-policy-bottom-<timestamp>.png`
  - When: After scrolling to last section
- **ARIA snapshot**: Capture heading structure and links
  - Filename: `privacy-policy-aria-<timestamp>.txt`
  - When: After step 1 completes
  - Expected roles: `heading` (h1, h2), `link` (email, external links), `list` (bulleted content)

## Gotchas

- **Static content**: This page has no dynamic behavior, so it's a good "smoke test" candidate but doesn't exercise much app logic.
- **Long page**: Full content is ~200+ lines. Don't try to screenshot the entire page in one go; capture representative sections.
- **External links**: Page includes links to Google Analytics opt-out and physical addresses. These are for display only; don't navigate away during test.
- **No Supabase calls**: Unlike most app pages, this one makes no Supabase queries, so missing env vars won't break it.
- **SEO metadata**: Page has custom `<title>` and `<meta>` tags. These are rendered server-side; if missing, check Next.js `Metadata` export in `page.tsx`.
