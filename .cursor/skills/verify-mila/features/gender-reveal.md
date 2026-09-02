# Gender Reveal Party (Protected)

The gender reveal page features an embedded YouTube video of the reveal event, followed by a paginated photo gallery loaded from Supabase Storage. Photos can be clicked to view full-size in a modal.

## Sub-features

- `gender-reveal-video`: Embedded YouTube iframe (16:9 aspect ratio)
- `gender-reveal-gallery`: Paginated photo grid (3 per load)
- `gender-reveal-modal`: Click image to preview full-size with close button
- `gender-reveal-pagination`: "View More" button loads additional photos

## How to get to it (user POV)

- **From navbar (authenticated)**: Navigate to "Gender Reveal" link
- **Direct URL**: Navigate to `http://localhost:3010/gender-reveal`
  - If not authenticated, redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key)
- **Authentication REQUIRED**: Valid Supabase session
- **Supabase Storage**: `mila_storage_bucket/gender-reveal/` folder populated with images
  - For tests without storage: Page may load empty gallery

### Steps

1. **Navigate to gender reveal page**:
   ```typescript
   await page.goto('http://localhost:3010/gender-reveal');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Page loads with heading "Gender Reveal Party"
   - Assertion: `await expect(page).toHaveURL(/\/gender-reveal/);`

2. **Verify page headings**:
   ```typescript
   const heading = page.locator('h4:has-text("Gender Reveal Party")');
   const date = page.locator('h4:has-text("January 21, 2023")');
   await expect(heading).toBeVisible();
   await expect(date).toBeVisible();
   ```
   - Observable result: Title and date displayed
   - Assertion: Both H4 elements visible

3. **Check YouTube video embed**:
   ```typescript
   const iframe = page.locator('iframe[src*="youtube.com/embed/lCzy6_hpcwc"]');
   await expect(iframe).toBeVisible();
   ```
   - Observable result: YouTube iframe embedded in 16:9 container
   - Assertion: iframe has correct video ID

4. **Verify photo gallery loads**:
   ```typescript
   const images = page.locator('.card img[src*="gender-reveal"]');
   const initialCount = await images.count();
   expect(initialCount).toBeGreaterThanOrEqual(3); // First batch of 3
   ```
   - Observable result: Photo cards rendered in grid (`.col-md-3`)
   - Assertion: At least 3 images loaded initially

5. **Click "View More" button**:
   ```typescript
   const viewMoreButton = page.locator('button:has-text("View More")');
   await expect(viewMoreButton).toBeVisible();
   await viewMoreButton.click();
   await page.waitForTimeout(1000); // Allow fetch to complete
   const newCount = await images.count();
   expect(newCount).toBeGreaterThan(initialCount);
   ```
   - Observable result: Additional 3 photos load
   - Assertion: Image count increases

6. **Click image to open modal**:
   ```typescript
   const firstImage = images.first();
   await firstImage.click();
   await page.waitForSelector('.modal.show', { state: 'visible' });
   const modal = page.locator('.modal.show');
   await expect(modal).toBeVisible();
   ```
   - Observable result: Modal overlay appears with full-size image
   - Assertion: Modal has `.show` class and is visible

7. **Close modal**:
   ```typescript
   const closeButton = modal.locator('button.btn-close');
   await closeButton.click();
   await expect(modal).not.toBeVisible();
   ```
   - Observable result: Modal closes, returns to gallery view
   - Assertion: Modal no longer visible

### Evidence capture
- **Screenshot 1**: Page with video and initial gallery
  - Filename: `gender-reveal-initial-<timestamp>.png`
  - When: After step 4 completes
- **Screenshot 2**: After clicking "View More"
  - Filename: `gender-reveal-expanded-<timestamp>.png`
  - When: After step 5 completes
- **Screenshot 3**: Modal open with full-size image
  - Filename: `gender-reveal-modal-<timestamp>.png`
  - When: After step 6 completes
- **ARIA snapshot**: Capture video iframe and gallery grid
  - Filename: `gender-reveal-aria-<timestamp>.txt`
  - When: After step 3 completes
  - Expected roles: `iframe` (video), `img` (gallery photos), `button` ("View More", modal close)

## Gotchas

- **Auth required**: Protected route, needs Supabase session.
- **Supabase Storage dependency**: Photos loaded from `mila_storage_bucket/gender-reveal/` via Storage API. If bucket is empty, gallery shows no images.
- **Pagination logic**: `offset` increases by `LIMIT` (3) on each "View More" click. Duplicate fetch prevention uses `useRef` to track offsets.
- **Deduplication**: Images are deduplicated by `name` to handle React Strict Mode double-renders.
- **CDN URL**: Hardcoded Supabase CDN URL (`https://pawkklvezvrmtpqbztwb.supabase.co/...`). If project changes, URL must be updated.
- **Modal backdrop**: Clicking anywhere on dark backdrop closes modal. Close button is styled with absolute positioning.
- **YouTube embed**: Video is public (`lCzy6_hpcwc`). If video is removed from YouTube, iframe will show error.
