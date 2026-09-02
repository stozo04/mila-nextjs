# Baby Shower Galleries (Protected)

The baby shower pages display photo galleries from two separate events: Houston (May 15, 2023) and Dallas (May 20, 2023). Both use the same `Gallery` component to load images from Supabase Storage with pagination.

## Sub-features

- `baby-shower-houston`: Houston event gallery at `/baby-shower/houston`
- `baby-shower-dallas`: Dallas event gallery at `/baby-shower/dallas`
- `baby-shower-gallery`: Reusable paginated photo grid component
- `baby-shower-pagination`: "View More" button to load additional photos

## How to get to it (user POV)

- **From navbar (authenticated)**: Navigate to "Baby Shower" dropdown → "Houston" or "Dallas"
- **Direct URLs**: 
  - Houston: `http://localhost:3010/baby-shower/houston`
  - Dallas: `http://localhost:3010/baby-shower/dallas`
  - If not authenticated, redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key)
- **Authentication REQUIRED**: Valid Supabase session
- **Supabase Storage**: `mila_storage_bucket/baby-shower/houston/` and `mila_storage_bucket/baby-shower/dallas/` folders populated
  - For tests without storage: Galleries may be empty

### Steps

#### Houston Event

1. **Navigate to Houston page**:
   ```typescript
   await page.goto('http://localhost:3010/baby-shower/houston');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Page loads with heading "Houston" and date "May 15, 2023"
   - Assertion: `await expect(page).toHaveURL(/\/baby-shower\/houston/);`

2. **Verify page header**:
   ```typescript
   const title = page.locator('text=Houston');
   const date = page.locator('text=May 15, 2023');
   await expect(title).toBeVisible();
   await expect(date).toBeVisible();
   ```
   - Observable result: Title and date rendered by `Header` component
   - Assertion: Both elements visible

3. **Check photo gallery loads**:
   ```typescript
   const images = page.locator('img[alt*="Baby Shower"]');
   const initialCount = await images.count();
   expect(initialCount).toBeGreaterThanOrEqual(3); // First batch
   ```
   - Observable result: Photos rendered in grid (limit 3 initially)
   - Assertion: At least 3 images loaded

4. **Click "View More" if present**:
   ```typescript
   const viewMoreButton = page.locator('button:has-text("View More")');
   if (await viewMoreButton.isVisible()) {
     const beforeCount = await images.count();
     await viewMoreButton.click();
     await page.waitForTimeout(1000);
     const afterCount = await images.count();
     expect(afterCount).toBeGreaterThan(beforeCount);
   }
   ```
   - Observable result: Additional photos load (next 3)
   - Assertion: Image count increases

#### Dallas Event

5. **Navigate to Dallas page**:
   ```typescript
   await page.goto('http://localhost:3010/baby-shower/dallas');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Page loads with heading "Dallas" and date "May 20, 2023"
   - Assertion: `await expect(page).toHaveURL(/\/baby-shower\/dallas/);`

6. **Verify Dallas page header**:
   ```typescript
   const title = page.locator('text=Dallas');
   const date = page.locator('text=May 20, 2023');
   await expect(title).toBeVisible();
   await expect(date).toBeVisible();
   ```
   - Observable result: Different title/date from Houston
   - Assertion: Dallas-specific content visible

7. **Check Dallas gallery loads**:
   ```typescript
   const dallasImages = page.locator('img[alt*="Baby Shower"]');
   const count = await dallasImages.count();
   expect(count).toBeGreaterThanOrEqual(3);
   ```
   - Observable result: Dallas photos loaded (separate folder in storage)
   - Assertion: At least 3 images

### Evidence capture
- **Screenshot 1**: Houston page with gallery
  - Filename: `baby-shower-houston-<timestamp>.png`
  - When: After step 3 completes
- **Screenshot 2**: Dallas page with gallery
  - Filename: `baby-shower-dallas-<timestamp>.png`
  - When: After step 7 completes
- **Screenshot 3**: Expanded Houston gallery (after "View More")
  - Filename: `baby-shower-houston-expanded-<timestamp>.png`
  - When: After step 4 completes (if button present)
- **ARIA snapshot**: Capture header and gallery grid
  - Filename: `baby-shower-aria-<timestamp>.txt`
  - When: After step 3 completes
  - Expected roles: `heading` (title/date), `img` (gallery photos), `button` ("View More")

## Gotchas

- **Auth required**: Protected routes, need Supabase session.
- **Supabase Storage dependency**: Photos loaded from `mila_storage_bucket/baby-shower/{houston|dallas}/` via the `Gallery` component. Empty folders result in empty galleries.
- **Shared component**: Both pages use the same `Gallery` component from `@/components/BabyShower/Gallery`. Only the `folder` prop differs.
- **Pagination**: Same pattern as gender-reveal (offset-based, limit 3, "View More" button).
- **No modal**: Unlike gender-reveal, these galleries don't have click-to-preview modals (as of current implementation).
- **Dropdown navigation**: In navbar, "Baby Shower" is a dropdown with two subitems. Test dropdown functionality if driving from navbar.
- **Image alt text**: Alt text may be generic or missing. Use `img[alt*="Baby Shower"]` or broader selectors.
