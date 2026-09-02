# Home Page (Landing Carousel)

The home page displays a Bootstrap carousel with 14 family photos of Mila. It auto-plays and allows manual navigation via prev/next controls. This is the first page a user sees when visiting the site.

## Sub-features

- `home-carousel`: Image carousel with 14 photos
- `home-nav-controls`: Previous/Next buttons for manual navigation
- `home-navbar`: Top navigation with brand logo and menu

## How to get to it (user POV)

- **Direct URL**: Navigate to `http://localhost:3010/`
- **From any page**: Click the Mila brand logo in top-left navbar

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- No authentication required (public page)
- Images in `/public/images/landing-page/` exist (1.jpg through 14.jpg)

### Steps

1. **Navigate to home page**: 
   ```typescript
   await page.goto('http://localhost:3010/');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Carousel container visible with first image (landing1) active
   - Assertion: `await expect(page.locator('#carouselExampleAutoplaying')).toBeVisible();`

2. **Verify carousel active item**:
   ```typescript
   const activeItem = page.locator('.carousel-item.active');
   await expect(activeItem).toBeVisible();
   ```
   - Observable result: First carousel item has `active` class
   - Assertion: `await expect(activeItem).toHaveClass(/active/);`

3. **Check navigation controls exist**:
   ```typescript
   const prevButton = page.locator('.carousel-control-prev');
   const nextButton = page.locator('.carousel-control-next');
   await expect(prevButton).toBeVisible();
   await expect(nextButton).toBeVisible();
   ```
   - Observable result: Previous and Next buttons rendered on left/right edges
   - Assertion: Both buttons have `carousel-control-*` classes

4. **Click Next button**:
   ```typescript
   await nextButton.click();
   await page.waitForTimeout(500); // Allow carousel transition
   ```
   - Observable result: Carousel advances to second image
   - Assertion: Active class moves to next `.carousel-item`

5. **Verify navbar branding**:
   ```typescript
   const navbarBrand = page.locator('.navbar-brand');
   await expect(navbarBrand).toBeVisible();
   ```
   - Observable result: Mila brand logo visible in navbar
   - Assertion: Image alt text is "Mila Gates"

### Evidence capture
- **Screenshot 1**: Initial landing (carousel on first image)
  - Filename: `home-landing-<timestamp>.png`
  - When: After step 1 completes
- **Screenshot 2**: After clicking Next
  - Filename: `home-carousel-next-<timestamp>.png`
  - When: After step 4 completes
- **ARIA snapshot**: Capture navbar and carousel controls
  - Filename: `home-aria-<timestamp>.txt`
  - When: After step 1 completes
  - Expected roles: `banner` (nav), `button` (carousel controls), `img` (carousel image)

## Gotchas

- **Bootstrap JS timing**: Carousel uses Bootstrap's JavaScript. If tests run before Bootstrap initializes, controls may not respond. Ensure `networkidle` before interacting.
- **Auto-play interference**: The carousel auto-plays (`data-bs-ride="carousel"`), which can cause flakiness if asserting exact active item. Consider disabling auto-play for tests or just verify controls work.
- **Image loading**: Large images may delay rendering. Use `waitForLoadState('networkidle')` or wait for first image element's `complete` property.
- **Visually-hidden text**: "Previous" and "Next" text are screen-reader-only (`.visually-hidden`). Use button element selectors, not text content.
