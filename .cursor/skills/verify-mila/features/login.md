# Login Page (Google OAuth)

The login page prompts users to sign in with their Google account via Supabase Auth. Clicking "Continue with Google" redirects to Google's OAuth consent screen, then back to `/auth/callback` on success.

## Sub-features

- `login-button`: Google sign-in button with icon and text
- `login-redirect`: OAuth flow initiation (redirect to Google)

## How to get to it (user POV)

- **Direct URL**: Navigate to `http://localhost:3010/login`
- **From protected route**: Attempting to access `/blogs`, `/sonograms`, etc. without auth redirects here
- **From navbar (unauthenticated)**: Click "Sign In" button in top-right navbar

## Driving it with Playwright

### Preconditions
- Dev server running on port 3010
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- No authentication required to **view** this page (but logging in requires real Google credentials)

### Steps

1. **Navigate to login page**:
   ```typescript
   await page.goto('http://localhost:3010/login');
   await page.waitForLoadState('networkidle');
   ```
   - Observable result: Login page renders with "Continue with Google" button
   - Assertion: `await expect(page).toHaveURL(/\/login/);`

2. **Verify Google login button exists**:
   ```typescript
   const loginButton = page.locator('a:has-text("Continue with Google")');
   await expect(loginButton).toBeVisible();
   ```
   - Observable result: Button with Google icon (FcGoogle) and text visible
   - Assertion: Button has classes indicating primary CTA styling

3. **Check button styling**:
   ```typescript
   await expect(loginButton).toHaveClass(/p-btn/);
   await expect(loginButton).toHaveClass(/bg1-color/);
   ```
   - Observable result: Button styled with primary brand colors, rounded-pill shape
   - Assertion: Classes match design system

4. **Verify Google icon present**:
   ```typescript
   const googleIcon = loginButton.locator('svg'); // FcGoogle renders as SVG
   await expect(googleIcon).toBeVisible();
   ```
   - Observable result: Google "G" logo icon appears before text
   - Assertion: SVG element is child of login button

5. **[Optional] Test OAuth redirect**:
   ```typescript
   // WARNING: This will initiate real OAuth flow, only test in isolated environment
   await loginButton.click();
   await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 });
   ```
   - Observable result: Browser redirects to Google's OAuth consent page
   - Assertion: URL contains `accounts.google.com`
   - **Note**: Do NOT complete login in automated tests without mock auth

### Evidence capture
- **Screenshot 1**: Login page loaded
  - Filename: `login-initial-<timestamp>.png`
  - When: After step 1 completes
- **Screenshot 2**: Before clicking button (hover state)
  - Filename: `login-button-ready-<timestamp>.png`
  - When: After step 4 completes
- **ARIA snapshot**: Capture login button and surrounding context
  - Filename: `login-aria-<timestamp>.txt`
  - When: After step 2 completes
  - Expected roles: `link` (button is actually a Next.js Link with `href="#"` and `onClick`), `img` (Google icon)

## Gotchas

- **OAuth redirect**: Clicking the login button will start real OAuth flow unless Supabase is mocked. For automated tests, stop at verifying button exists and is clickable.
- **Supabase client-side init**: The button calls `supabase.auth.signInWithOAuth()`, which requires valid Supabase URL/key. If env vars are missing, expect console errors.
- **Button element**: Despite looking like a button, it's a Next.js `<Link>` with `onClick` handler. Selector should use `a` tag or text content.
- **Redirect URL**: OAuth redirects to `/auth/callback`, which needs matching route to handle token exchange. If route is missing, auth will fail even with valid credentials.
- **No manual login**: This feature map does not include automated Google login. Protected features are mapped separately and marked as `verified-unreachable` without human-assisted auth.
