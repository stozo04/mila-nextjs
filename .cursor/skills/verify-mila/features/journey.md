# Journey Galleries (Protected)

The "My Journey" section features milestone galleries documenting Mila's growth across multiple years. Each journey page displays cards that can be clicked to view detailed milestone content. Pages include: Birthday, First Year, One Year, Second Year, and Third Year.

## Sub-features

- `journey-birthday`: Delivery day photo gallery at `/my-journey/birthday`
- `journey-first-year`: Milestone cards for first 12 months at `/my-journey/first-year`
- `journey-one-year`: One year milestone cards at `/my-journey/one-year`
- `journey-second-year`: Two year milestone cards at `/my-journey/second-year`
- `journey-third-year`: Three year milestone cards at `/my-journey/third-year`
- `journey-card-pagination`: "Show More" button loads additional cards (3 at a time)
- `journey-card-detail`: Click "View" button to navigate to card detail page

## How to get to it (user POV)

- **From navbar (authenticated)**: Navigate to "My Journey" dropdown → select year
- **Direct URLs**: 
  - Birthday: `http://localhost:3010/my-journey/birthday`
  - First Year: `http://localhost:3010/my-journey/first-year`
  - One Year: `http://localhost:3010/my-journey/one-year`
  - Second Year: `http://localhost:3010/my-journey/second-year`
  - Third Year: `http://localhost:3010/my-journey/third-year`
  - If not authenticated, redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key)
- **Authentication REQUIRED**: Valid Supabase session
- **Database**: 
  - `journey_cards` table with entries for each `journey_type` (`'first-year'`, `'one-year'`, etc.)
  - For Birthday page: Supabase Storage folder `birthday/delivery-day/` with photos
- **Empty state**: Pages without data show loading then empty grid

### Steps

#### Birthday Page (Gallery)

1. **Navigate to birthday page**:
   ```typescript
   await page.goto('http://localhost:3010/my-journey/birthday');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Page loads with header and photo gallery
   - Assertion: `await expect(page).toHaveURL(/\/my-journey\/birthday/);`

2. **Verify birthday header**:
   ```typescript
   const header = page.locator('text="When you were placed in my arms"');
   const date = page.locator('text=May 30, 2023');
   await expect(header).toBeVisible();
   await expect(date).toBeVisible();
   ```
   - Observable result: Sentimental quote header and birth date displayed
   - Assertion: Both elements visible

3. **Check gallery loads photos**:
   ```typescript
   const images = page.locator('img[alt*="Birthday"]');
   const count = await images.count();
   expect(count).toBeGreaterThanOrEqual(3); // Initial batch
   ```
   - Observable result: Photos from `birthday/delivery-day/` folder rendered
   - Assertion: At least 3 images loaded

#### First Year Page (Milestone Cards)

4. **Navigate to first year page**:
   ```typescript
   await page.goto('http://localhost:3010/my-journey/first-year');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Page loads with heading "My First Year Journey"
   - Assertion: `await expect(page).toHaveURL(/\/my-journey\/first-year/);`

5. **Verify page heading and description**:
   ```typescript
   const heading = page.locator('h1:has-text("My First Year Journey")');
   const lead = page.locator('.lead:has-text("precious moments and milestones")');
   await expect(heading).toBeVisible();
   await expect(lead).toBeVisible();
   ```
   - Observable result: Page title and lead paragraph displayed
   - Assertion: Both elements present

6. **Check milestone cards rendered**:
   ```typescript
   const cards = page.locator('.card').filter({ has: page.locator('button:has-text("View")') });
   const count = await cards.count();
   expect(count).toBeGreaterThan(0); // At least one card (max 3 initially)
   ```
   - Observable result: Cards with title, message, and "View" button
   - Assertion: At least one card present

7. **Test "Show More" pagination**:
   ```typescript
   const showMoreButton = page.locator('button:has-text("Show More")');
   if (await showMoreButton.isVisible()) {
     const beforeCount = await cards.count();
     await showMoreButton.click();
     await page.waitForTimeout(500);
     const afterCount = await cards.count();
     expect(afterCount).toBeGreaterThan(beforeCount);
   }
   ```
   - Observable result: Additional 3 cards load
   - Assertion: Card count increases (if more cards available)

8. **Click "View" to navigate to card detail**:
   ```typescript
   const firstViewButton = cards.first().locator('button:has-text("View")');
   await firstViewButton.click();
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Navigates to detail page `/my-journey/first-year/<slug>`
   - Assertion: `await expect(page).toHaveURL(/\/my-journey\/first-year\/.+/);`

#### Other Journey Years

9. **Verify One Year page**:
   ```typescript
   await page.goto('http://localhost:3010/my-journey/one-year');
   await page.waitForLoadState('networkidle');
   const heading = page.locator('h1'); // May have different heading
   await expect(heading).toBeVisible();
   ```
   - Observable result: One Year journey page with milestone cards (same pattern as First Year)
   - Assertion: Page loads successfully

10. **Verify Second Year page**:
    ```typescript
    await page.goto('http://localhost:3010/my-journey/second-year');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    ```
    - Observable result: Second Year journey page (same pattern)
    - Assertion: Page loads successfully

11. **Verify Third Year page**:
    ```typescript
    await page.goto('http://localhost:3010/my-journey/third-year');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    ```
    - Observable result: Third Year journey page (same pattern)
    - Assertion: Page loads successfully

### Evidence capture
- **Screenshot 1**: Birthday gallery page
  - Filename: `journey-birthday-<timestamp>.png`
  - When: After step 3 completes
- **Screenshot 2**: First Year milestone cards
  - Filename: `journey-first-year-<timestamp>.png`
  - When: After step 6 completes
- **Screenshot 3**: Expanded card list (after "Show More")
  - Filename: `journey-first-year-expanded-<timestamp>.png`
  - When: After step 7 completes (if button present)
- **Screenshot 4**: One/Two/Three Year pages (sample)
  - Filename: `journey-<year>-<timestamp>.png`
  - When: After steps 9-11 complete
- **ARIA snapshot**: Capture card grid structure
  - Filename: `journey-aria-<timestamp>.txt`
  - When: After step 6 completes
  - Expected roles: `heading` (page title), `button` ("View", "Show More"), `card` (milestone cards)

## Gotchas

- **Auth required**: All journey pages are protected routes.
- **Database dependency**: Milestone card pages (`first-year`, `one-year`, etc.) fetch from `journey_cards` table filtered by `journey_type`. Empty results show empty grid.
- **Birthday page different**: Birthday uses `Gallery` component (photo grid from Storage), not milestone cards. Different structure from other journey pages.
- **Shared pattern**: First Year, One Year, Second Year, Third Year all use identical component structure (only `journey_type` filter differs). Test once to validate pattern.
- **Pagination**: Cards load 3 at a time (`visibleCount` starts at 3, increases by 3). "Show More" only appears if `cards.length >= visibleCount`.
- **Detail pages**: Clicking "View" navigates to `/my-journey/<year>/<slug>`. Ensure detail routes exist to test navigation.
- **Loading state**: Pages show spinner while fetching cards. Fast renders may not show spinner.
- **Card slugs**: Each milestone card has unique `slug` for detail page URL. Slugs must be URL-safe.
- **Dropdown navigation**: In navbar, "My Journey" is a dropdown with 5 subitems. Test dropdown functionality if driving from navbar.
- **Empty state behavior**: If no cards exist for a journey type, page shows heading/lead but empty grid (no error message displayed).
