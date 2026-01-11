import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('admin can upload assets to skater profile', async ({ page }) => {
  // 1. Login
  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  console.log("Page loaded. Title:", await page.title());
  // console.log("Content:", await page.content()); // Too verbose
  
  await expect(page.locator('h2')).toContainText('Sign in to SkatePlan');
  
  await page.locator('#email').fill('admin@skateplan.bradnet.net');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  await expect(page).toHaveURL('http://localhost:3000/dashboard/roster');
  console.log("Logged in.");

  // 2. Ensure a skater exists (create one if empty)
  // We can just try to click the first row, or add one.
  // Let's add one to be safe and consistent.
  await page.click('button:has-text("+ Add Skater")');
  await page.fill('input[value=""]', 'Asset Test Skater'); // Name
  // The modal inputs are tricky to target by label if not associated correctly, but based on my code:
  // inputs: Name, DOB, Select Level
  // Name is first input
  // DOB is second input
  await page.locator('input[type="date"]').fill('2010-01-01');
  await page.selectOption('select', 'Senior');
  
  // Use specific selector for the modal submit button
  await page.click('button[type="submit"]:has-text("Add Skater")');
  
  // 3. Navigate to skater profile
  // Click on the skater name in the table
  await page.click('text=Asset Test Skater');
  
  // 4. Create dummy files
  const testDir = path.resolve(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
  const mp3Path = path.join(testDir, 'test.mp3');
  const pngPath = path.join(testDir, 'test.png');
  fs.writeFileSync(mp3Path, 'dummy audio content');
  fs.writeFileSync(pngPath, 'dummy image content');

  // 5. Upload MP3 (Music Tab is default)
  await page.setInputFiles('input[type="file"]', mp3Path);
  // Wait for upload to finish (the component refetches)
  // Reload to ensure persistence
  await page.waitForTimeout(1000); // Wait for upload
  await page.reload();
  await expect(page.locator('body')).toContainText('test.mp3');

  // 6. Upload PNG (Switch to Visuals)
  await page.click('button:has-text("Visual")');
  await page.setInputFiles('input[type="file"]', pngPath);
  await expect(page.locator('text=test.png')).toBeVisible();

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
});
