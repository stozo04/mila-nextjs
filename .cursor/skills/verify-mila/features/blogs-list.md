# Blogs List (Protected)

The blogs page displays a paginated list of family blog posts with filtering by tag and search by title. Only authenticated users can access this page. Admins see a "Create Blog" button.

## Sub-features

- `blogs-list-cards`: Grid of blog post cards with images, titles, dates
- `blogs-filter-tags`: Tag filter pills ("All", plus dynamic tags from DB)
- `blogs-search`: Search input to filter by title
- `blogs-pagination`: "View More" button to load additional posts
- `blogs-create-button`: Admin-only button to create new blogs

## How to get to it (user POV)

- **From navbar (authenticated)**: Click "Blogs" in top navigation
- **Direct URL**: Navigate to `http://localhost:3010/blogs`
  - If not authenticated, Supabase middleware redirects to `/login`

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Authentication REQUIRED**: User must have valid Supabase session (Google OAuth)
  - For automated tests without real auth: Mark as `verified-unreachable`
- Database: `blogs` table populated with sample data (else page shows empty state)

### Steps

**Note**: These steps assume authentication is handled outside this test (e.g., manual login before test, or Supabase auth mock).

1. **Navigate to blogs page**:
   ```typescript
   await page.goto('http://localhost:3010/blogs');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: If authenticated, blogs page loads; if not, redirects to `/login`
   - Assertion: `await expect(page).toHaveURL(/\/blogs/);` (or `/login` if auth failed)

2. **Verify loading state**:
   ```typescript
   // During fetch, Loading component should appear briefly
   const spinner = page.locator('.spinner-border');
   // May already be gone by the time we check, so use waitFor with short timeout
   ```
   - Observable result: Loading spinner displays while fetching blogs from Supabase
   - Assertion: Optional (timing-dependent)

3. **Check blog cards rendered**:
   ```typescript
   const blogCards = page.locator('.card').filter({ hasText: 'Read More' });
   const count = await blogCards.count();
   expect(count).toBeGreaterThan(0); // At least one blog
   ```
   - Observable result: Grid of blog cards (`.col-md-4`) with images, titles, dates
   - Assertion: At least one card present (assumes non-empty DB)

4. **Verify tag filter pills**:
   ```typescript
   const tagButtons = page.locator('button.rounded-pill').filter({ hasText: /\(/ }); // e.g., "All (5)"
   const allButton = page.locator('button.rounded-pill:has-text("All")');
   await expect(allButton).toBeVisible();
   ```
   - Observable result: "All" tag button is visible, plus any custom tags from DB
   - Assertion: "All" button has count in parentheses

5. **Click tag filter**:
   ```typescript
   // Assume a tag "Family" exists in DB
   const familyTag = page.locator('button.rounded-pill:has-text("Family")');
   if (await familyTag.isVisible()) {
     await familyTag.click();
     await page.waitForTimeout(500); // Allow re-fetch
     // Filtered results should show only "Family" tagged blogs
   }
   ```
   - Observable result: Blog list updates to show only matching tag
   - Assertion: Filtered card count matches tag count

6. **Use search input**:
   ```typescript
   const searchInput = page.locator('input[type="search"][placeholder*="Search by title"]');
   await searchInput.fill('First');
   await page.waitForTimeout(500); // Debounce in useEffect
   ```
   - Observable result: Blog list filters to titles containing "First"
   - Assertion: Displayed blogs have "First" in title

7. **[Admin only] Check "Create Blog" button**:
   ```typescript
   // Only visible if user.email === NEXT_PUBLIC_ADMIN_EMAIL
   const createButton = page.locator('button:has-text("Create Blog")');
   // May not be visible for non-admin users
   if (await createButton.isVisible()) {
     await expect(createButton).toHaveClass(/btn-success/);
   }
   ```
   - Observable result: Green "Create Blog" button appears for admin user
   - Assertion: Button exists and is styled correctly

8. **Click "View More" pagination**:
   ```typescript
   const viewMoreButton = page.locator('button:has-text("View More")');
   if (await viewMoreButton.isVisible()) {
     const initialCount = await blogCards.count();
     await viewMoreButton.click();
     await page.waitForTimeout(500);
     const newCount = await blogCards.count();
     expect(newCount).toBeGreaterThan(initialCount);
   }
   ```
   - Observable result: Additional blog cards load (visibleCount increases by 3)
   - Assertion: Card count increases after click

### Evidence capture
- **Screenshot 1**: Blogs page initial load (first 3 blogs)
  - Filename: `blogs-list-initial-<timestamp>.png`
  - When: After step 3 completes
- **Screenshot 2**: After applying tag filter
  - Filename: `blogs-list-filtered-<timestamp>.png`
  - When: After step 5 completes
- **Screenshot 3**: After search query
  - Filename: `blogs-list-search-<timestamp>.png`
  - When: After step 6 completes
- **ARIA snapshot**: Capture filter controls and blog cards
  - Filename: `blogs-list-aria-<timestamp>.txt`
  - When: After step 4 completes
  - Expected roles: `button` (filters, pagination), `img` (featured images), `link` ("Read More" links)

## Gotchas

- **Auth gating**: Without valid Supabase session, this page is inaccessible. Protected route middleware redirects to `/login`. Automated tests need auth context or must mark as `verified-unreachable`.
- **Empty state**: If `blogs` table is empty, page shows no cards and no "View More" button. Ensure test DB has sample data.
- **Tag filter timing**: Tag selection triggers `useEffect` which re-fetches. Allow time for network request to complete (use `waitForLoadState('networkidle')` or `waitForResponse`).
- **Search debounce**: Search input uses `onChange` without debounce in current code, but `useEffect` fires on every keystroke. Tests should wait briefly after typing.
- **Admin check**: "Create Blog" button only appears if `user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL`. In test env, this var may not be set.
- **Draft badges**: Blogs with `is_draft: true` show a yellow "Draft" banner. Only admins should see these in the list.
- **Featured images**: Some blogs may not have `featured_image` set. Cards without images still render title + date.
