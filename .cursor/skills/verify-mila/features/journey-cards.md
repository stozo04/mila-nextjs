# Journey Cards (My First Year)

The journey cards page displays milestone cards from Mila's first year. Each card can be clicked to view details. This is a protected route requiring authentication.

## Sub-features

- `journey-cards-grid`: Grid layout of journey card tiles
- `journey-card-view`: Click card to navigate to detail page
- `journey-pagination`: "Show More" button to load additional cards

## How to get to it (user POV)

- **From navbar (authenticated)**: Navigate to "My Journey" dropdown → "My First Year"
- **Direct URL**: Navigate to `http://localhost:3010/my-journey/first-year`
  - If not authenticated, redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key)
- **Authentication REQUIRED**: Valid Supabase session
  - For automated tests without auth: Mark as `verified-unreachable`
- Database: `journey_cards` table with `journey_type: 'first-year'` entries

### Steps

**Note**: Assumes authentication is handled before this test.

1. **Navigate to first year journey page**:
   ```typescript
   await page.goto('http://localhost:3010/my-journey/first-year');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Journey cards page loads (or redirects to login)
   - Assertion: `await expect(page).toHaveURL(/\/my-journey\/first-year/);`

2. **Verify page heading**:
   ```typescript
   const heading = page.locator('h1:has-text("My First Year Journey")');
   await expect(heading).toBeVisible();
   ```
   - Observable result: Page heading and lead text appear
   - Assertion: H1 contains "My First Year Journey"

3. **Check journey cards rendered**:
   ```typescript
   const cards = page.locator('.card').filter({ has: page.locator('button:has-text("View")') });
   const count = await cards.count();
   expect(count).toBeGreaterThan(0);
   ```
   - Observable result: Cards displayed in grid (max 3 initially)
   - Assertion: At least one card present

4. **Verify card structure**:
   ```typescript
   const firstCard = cards.first();
   const title = firstCard.locator('.card-title');
   const message = firstCard.locator('.card-text');
   const viewButton = firstCard.locator('button:has-text("View")');
   await expect(title).toBeVisible();
   await expect(message).toBeVisible();
   await expect(viewButton).toBeVisible();
   ```
   - Observable result: Each card has title, message preview, and "View" button
   - Assertion: All elements present in first card

5. **Click "Show More" button**:
   ```typescript
   const showMoreButton = page.locator('button:has-text("Show More")');
   if (await showMoreButton.isVisible()) {
     const initialCount = await cards.count();
     await showMoreButton.click();
     await page.waitForTimeout(500);
     const newCount = await cards.count();
     expect(newCount).toBeGreaterThan(initialCount);
   }
   ```
   - Observable result: Additional 3 cards load
   - Assertion: Card count increases by 3 (or remaining cards)

6. **Click a card's "View" button**:
   ```typescript
   const firstViewButton = cards.first().locator('button:has-text("View")');
   await firstViewButton.click();
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Navigates to detail page `/my-journey/first-year/<slug>`
   - Assertion: `await expect(page).toHaveURL(/\/my-journey\/first-year\/.+/);`

### Evidence capture
- **Screenshot 1**: Journey cards page initial load
  - Filename: `journey-cards-initial-<timestamp>.png`
  - When: After step 2 completes
- **Screenshot 2**: After clicking "Show More"
  - Filename: `journey-cards-expanded-<timestamp>.png`
  - When: After step 5 completes (if button was present)
- **Screenshot 3**: Card detail page (after clicking "View")
  - Filename: `journey-card-detail-<timestamp>.png`
  - When: After step 6 completes
- **ARIA snapshot**: Capture card grid and buttons
  - Filename: `journey-cards-aria-<timestamp>.txt`
  - When: After step 3 completes
  - Expected roles: `button` ("View", "Show More"), `heading` (card titles)

## Gotchas

- **Auth required**: Same as blogs-list, this is a protected route. Tests need valid session.
- **Empty state**: If no `journey_cards` for `journey_type: 'first-year'`, page shows loading spinner then empty grid. Ensure test data exists.
- **Pagination logic**: "Show More" button only appears if `cards.length >= visibleCount`. With fewer than 3 cards in DB, button won't show.
- **Loading state**: Page shows spinner while fetching. If test runs too fast, may not see spinner at all.
- **Card slugs**: Each card has unique `slug` used for detail page URL. Ensure slugs in test data are URL-safe.
- **Other journey types**: Similar pages exist for `/my-journey/one-year`, `/my-journey/second-year`, etc. Same driving pattern applies, just filter by different `journey_type`.
