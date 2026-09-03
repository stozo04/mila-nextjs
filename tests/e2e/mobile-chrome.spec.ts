import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('nav actions share the mobile menu alignment', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await expect(toggle).toBeVisible();
  await toggle.click();

  const support = page.getByRole('link', { name: 'Support Mila' });
  const signIn = page.getByRole('button', { name: 'Sign In' });
  await expect(support).toBeVisible();
  await expect(signIn).toBeVisible();

  const [supportBox, signInBox] = await Promise.all([
    support.boundingBox(),
    signIn.boundingBox(),
  ]);

  expect(supportBox).not.toBeNull();
  expect(signInBox).not.toBeNull();
  expect(Math.abs(signInBox!.x - supportBox!.x)).toBeLessThanOrEqual(1);
  await expect(signIn).toHaveCSS('text-align', 'start');
});

test('chat stays usable and wraps a long draft on mobile', async ({ page }) => {
  await page.getByRole('button', { name: 'Open chat' }).click();

  const panel = page.getByRole('dialog', { name: 'Chat with me' });
  const close = page.getByRole('button', { name: 'Close chat panel' });
  const composer = page.getByRole('textbox', { name: 'Message' });
  const launcher = page.getByRole('button', { name: 'Close chat' });

  await expect(panel).toBeVisible();
  await expect(composer).toHaveJSProperty('tagName', 'TEXTAREA');

  const initialHeight = await composer.evaluate((element) => element.clientHeight);
  const draft =
    'When did Mila learn the days of the week, and what did she understand about them at the time?';
  await composer.fill(draft);
  await expect(composer).toHaveValue(draft);

  const composerMetrics = await composer.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(composerMetrics.clientHeight).toBeGreaterThan(initialHeight);
  expect(composerMetrics.scrollHeight).toBeLessThanOrEqual(
    composerMetrics.clientHeight + 2,
  );

  const [panelBox, closeBox, launcherBox] = await Promise.all([
    panel.boundingBox(),
    close.boundingBox(),
    launcher.boundingBox(),
  ]);
  const viewport = page.viewportSize();

  expect(panelBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(launcherBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(closeBox!.width).toBeGreaterThanOrEqual(44);
  expect(closeBox!.height).toBeGreaterThanOrEqual(44);
  await expect(close.locator('svg')).toHaveAttribute('width', '24');
  await expect(close.locator('svg')).toHaveAttribute('height', '24');
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(launcherBox!.y);

  // Intentionally do not submit: /api/chat-stream is billable.
  await close.click();
  await expect(panel).toBeHidden();
});
