import { test, expect } from '@playwright/test';

test('coach can build custom benchmark template', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:3000/login');
  await page.locator('#email').fill('admin@skateplan.bradnet.net');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);

  // 2. Navigate to Benchmarks
  await page.goto('http://localhost:3000/dashboard/benchmarks');
  
  // 3. Open Builder
  await page.click('text=Create Template');
  
  // 4. Add Name
  await page.fill('input[name="templateName"]', 'Playwright Test Template');
  
  // 5. Add Metric Rows
  await page.click('button:has-text("Add Metric")');
  await page.fill('input[placeholder="Metric Label"]', 'Jump Height');
  await page.selectOption('select', 'NUMERIC');
  
  await page.click('button:has-text("Add Metric")');
  await page.locator('input[placeholder="Metric Label"]').nth(1).fill('Notes');
  await page.locator('select').nth(1).selectOption('TEXT');

  // 6. Remove Row (Optional check)
  // await page.click('button:has-text("Remove")'); 

  // 7. Save
  await page.click('button:has-text("Save Template")');
  
  // 8. Verify List
  await expect(page.locator('body')).toContainText('Playwright Test Template');
});
