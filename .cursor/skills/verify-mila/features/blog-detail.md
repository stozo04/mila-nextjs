# Blog Post Detail (Protected)

The blog detail page displays a single blog post with full content (parsed HTML), featured image, date, optional YouTube video, and a "Listen" button that generates and streams text-to-speech audio. Admins see additional controls to publish draft posts.

## Sub-features

- `blog-content`: Full HTML content parsed and rendered
- `blog-featured-image`: Optional featured image at top of post
- `blog-video`: Optional embedded YouTube video (if `video_link` set)
- `blog-tts`: "Listen" button generates and plays audio narration of post content
- `blog-admin-publish`: Admins can publish draft posts (button only visible for `is_draft` posts)
- `blog-image-modal`: Click inline images to view full-size in modal

## How to get to it (user POV)

- **From blogs list**: Click "Read More" on any blog card at `/blogs`
- **Direct URL**: Navigate to `http://localhost:3010/blogs/<slug>` (e.g., `/blogs/welcome-mila`)
  - If not authenticated, redirects to `/login`
  - If slug doesn't exist, shows 404

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set (Supabase URL/key, **optional** `OPENAI_API_KEY` for TTS)
- **Authentication REQUIRED**: Valid Supabase session
- **Database**: `blogs` table with at least one blog entry (e.g., slug `welcome-mila`)
- **TTS feature**: Requires `OPENAI_API_KEY` to generate audio. Without it, "Listen" button may error.

### Steps

1. **Navigate to blog detail page**:
   ```typescript
   await page.goto('http://localhost:3010/blogs/welcome-mila'); // Example slug
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Blog detail page loads with title and content
   - Assertion: `await expect(page).toHaveURL(/\/blogs\/welcome-mila/);`

2. **Verify blog title and date**:
   ```typescript
   const title = page.locator('h1'); // Blog title
   const date = page.locator('text=/[A-Z][a-z]+ \\d{1,2}, \\d{4}/'); // Formatted date
   await expect(title).toBeVisible();
   await expect(date).toBeVisible();
   ```
   - Observable result: Blog title (H1) and formatted date displayed
   - Assertion: Both elements present

3. **Check featured image** (if blog has one):
   ```typescript
   const featuredImage = page.locator('img[alt*="Featured"]');
   if (await featuredImage.isVisible()) {
     await expect(featuredImage).toHaveAttribute('src', /.+/);
   }
   ```
   - Observable result: Featured image rendered above content (if `featured_image` field set)
   - Assertion: Image has valid `src` attribute

4. **Verify HTML content parsed**:
   ```typescript
   const contentContainer = page.locator('div').filter({ hasText: /Welcome|Dear|Hello/ }); // Sample content text
   await expect(contentContainer).toBeVisible();
   ```
   - Observable result: Blog content HTML parsed and rendered (using `html-react-parser`)
   - Assertion: Content text visible on page

5. **Check YouTube video embed** (if blog has one):
   ```typescript
   const iframe = page.locator('iframe[src*="youtube.com"]');
   if (await iframe.isVisible()) {
     await expect(iframe).toHaveAttribute('src', /youtube\.com/);
   }
   ```
   - Observable result: YouTube video embedded in 16:9 container (if `video_link` field set)
   - Assertion: iframe with normalized YouTube URL

6. **Test "Listen" button (TTS)**:
   ```typescript
   const listenButton = page.locator('button:has-text("Listen")');
   await expect(listenButton).toBeVisible();
   
   // Click to generate audio (this will make API call to /api/blog/[slug]/audio)
   await listenButton.click();
   
   // Wait for audio to start loading or playing
   await page.waitForSelector('audio', { state: 'attached', timeout: 10000 });
   const audio = page.locator('audio');
   await expect(audio).toHaveAttribute('src', /.+/);
   ```
   - Observable result: Clicking "Listen" generates audio, button text changes to "Pause" (or shows loading)
   - Assertion: `<audio>` element appears with blob URL source
   - **Note**: Requires `OPENAI_API_KEY` env var. Without it, expect error state.

7. **Admin publish button** (only visible for drafts):
   ```typescript
   const publishButton = page.locator('button:has-text("Publish this letter")');
   if (await publishButton.isVisible()) {
     // Only admins see this on draft posts
     await expect(publishButton).toBeEnabled();
   }
   ```
   - Observable result: If logged in as admin AND blog is draft, publish button appears
   - Assertion: Button visible and enabled for admin user

8. **Click inline image to open modal** (if content has images):
   ```typescript
   const inlineImage = page.locator('img[style*="cursor: pointer"]').first();
   if (await inlineImage.isVisible()) {
     await inlineImage.click();
     const modal = page.locator('.modal.show');
     await expect(modal).toBeVisible();
     
     // Close modal
     const closeButton = modal.locator('button.btn-close');
     await closeButton.click();
     await expect(modal).not.toBeVisible();
   }
   ```
   - Observable result: Clicking inline image opens full-size preview modal
   - Assertion: Modal visible, then closes on button click

### Evidence capture
- **Screenshot 1**: Blog detail page loaded
  - Filename: `blog-detail-initial-<timestamp>.png`
  - When: After step 2 completes
- **Screenshot 2**: After clicking "Listen" (audio loading)
  - Filename: `blog-detail-audio-<timestamp>.png`
  - When: After step 6 completes
- **Screenshot 3**: Admin publish controls (if draft + admin)
  - Filename: `blog-detail-admin-<timestamp>.png`
  - When: After step 7 completes (if button present)
- **ARIA snapshot**: Capture blog content structure
  - Filename: `blog-detail-aria-<timestamp>.txt`
  - When: After step 4 completes
  - Expected roles: `heading` (title), `img` (featured/inline images), `button` ("Listen", "Publish"), `iframe` (video)

## Gotchas

- **Auth required**: Protected route, needs Supabase session.
- **Dynamic slug**: Blog fetched by `slug` parameter from URL. If slug doesn't exist in DB, `notFound()` is called (404 page).
- **HTML parsing**: Content stored as HTML string in DB, parsed with `html-react-parser`. Malformed HTML may render incorrectly.
- **TTS dependency**: "Listen" button calls `/api/blog/[slug]/audio`, which requires `OPENAI_API_KEY`. Without it, endpoint returns 500 or 202 (polling for async generation).
- **Audio caching**: Once audio is generated, `audioUrl` is stored in state. Subsequent clicks play/pause cached audio.
- **Admin check**: Publish button only visible if `user.email === NEXT_PUBLIC_ADMIN_EMAIL` (or via `is_mila_admin` RPC). Test env may not have admin user.
- **Draft banner**: Draft posts show yellow banner at top. Only admins can view drafts; non-admins get 404.
- **Image modal**: Inline images made clickable via `useEffect` that adds event listeners. Not all images may have this behavior (depends on content HTML).
- **YouTube URL normalization**: `video_link` field supports various YouTube formats (watch, youtu.be, embed). Normalized via `normalizeYoutubeUrl` helper.
- **Loading states**: Page shows `<Loading />` component while fetching blog. Audio button shows "Generating audio..." while TTS is processing.
