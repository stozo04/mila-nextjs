# Sonograms Gallery (Protected)

The sonograms page displays a grid of prenatal ultrasound images from Mila's pregnancy, organized chronologically. Each card links to a detail page with more images from that session.

## Sub-features

- `sonograms-grid`: Five sonogram cards with thumbnail, title, and date
- `sonogram-detail-link`: Click card to view full session images

## How to get to it (user POV)

- **From navbar (authenticated)**: Click "Sonograms" in top navigation
- **Direct URL**: Navigate to `http://localhost:3010/sonograms`
  - If not authenticated, redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key)
- **Authentication REQUIRED**: Valid Supabase session
  - For automated tests without auth: Mark as `verified-unreachable`
- Images exist at `/public/images/sonograms/sonogram-{1-5}/1.jpg`

### Steps

1. **Navigate to sonograms page**:
   ```typescript
   await page.goto('http://localhost:3010/sonograms');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Sonograms page loads with heading "Welcome to the world, Mila!"
   - Assertion: `await expect(page).toHaveURL(/\/sonograms/);`

2. **Verify page heading**:
   ```typescript
   const heading = page.locator('h1:has-text("Welcome to the world, Mila!")');
   await expect(heading).toBeVisible();
   ```
   - Observable result: Page heading appears at top
   - Assertion: H1 contains expected text

3. **Check sonogram cards rendered**:
   ```typescript
   const cards = page.locator('.card').filter({ has: page.locator('img[alt^="Sonogram"]') });
   const count = await cards.count();
   expect(count).toBe(5); // Exactly 5 sonograms
   ```
   - Observable result: 5 cards in grid (`.col-md-3` layout)
   - Assertion: Card count matches data array

4. **Verify card structure**:
   ```typescript
   const firstCard = cards.first();
   const title = firstCard.locator('.card-title:has-text("Sonogram 1")');
   const date = firstCard.locator('.card-text:has-text("November 23, 2022")');
   const image = firstCard.locator('img[src*="sonogram-1"]');
   await expect(title).toBeVisible();
   await expect(date).toBeVisible();
   await expect(image).toBeVisible();
   ```
   - Observable result: First card shows image, title, and date
   - Assertion: All elements present

5. **Check card is clickable link**:
   ```typescript
   const cardLink = page.locator('a[href="/sonograms/1"]');
   await expect(cardLink).toBeVisible();
   ```
   - Observable result: Card wrapped in Next.js Link to `/sonograms/1`
   - Assertion: Link element exists

6. **Click first card**:
   ```typescript
   await cardLink.click();
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Navigates to sonogram detail page
   - Assertion: `await expect(page).toHaveURL(/\/sonograms\/1/);`

### Evidence capture
- **Screenshot 1**: Sonograms grid page
  - Filename: `sonograms-grid-<timestamp>.png`
  - When: After step 3 completes
- **Screenshot 2**: First card close-up (hover state)
  - Filename: `sonograms-card-<timestamp>.png`
  - When: Before step 6
- **ARIA snapshot**: Capture card grid and links
  - Filename: `sonograms-aria-<timestamp>.txt`
  - When: After step 3 completes
  - Expected roles: `link` (card wrappers), `img` (thumbnails), `heading` (card titles)

## Gotchas

- **Auth required**: Protected route, requires Supabase session.
- **Static data**: Sonogram list is hardcoded in component (not from DB). Always 5 cards.
- **Image paths**: Images must exist in `/public/images/sonograms/` or cards will show broken images.
- **Detail pages**: Clicking a card navigates to `/sonograms/[id]` detail page. Ensure those routes exist to test navigation.
- **Card styling**: Cards use Bootstrap `.card` class with hover effects. Test in real browser for visual verification.
