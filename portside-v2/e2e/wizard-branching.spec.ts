import { test, expect } from "@playwright/test";

// Integer inputs default to "" which fails validation.
// Click +/- to set the stored value to "0" so Continue enables.
async function setIntegerToZero(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Increase" }).click();
  await page.getByRole("button", { name: "Decrease" }).click();
}

// Helper to quickly navigate through the early wizard steps
async function fillEarlySteps(page: import("@playwright/test").Page) {
  await page.goto("/lease");

  // Property address
  await page.getByPlaceholder("Start typing an address...").fill("100 Test Rd, Charleston, SC 29401");
  await page.getByRole("button", { name: "Continue" }).click();

  // County
  await page.getByPlaceholder("Dorchester").fill("Charleston");
  await page.getByRole("button", { name: "Continue" }).click();

  // Tenant name
  await page.getByPlaceholder("John Doe").fill("Alice Johnson");
  await page.getByRole("button", { name: "Continue" }).click();

  // Add another tenant? No
  await page.getByRole("button", { name: /No/i }).click();
}

test.describe("Conditional Branching", () => {
  test("adding multiple tenants loops back", async ({ page }) => {
    await page.goto("/lease");

    // Property address
    await page.getByPlaceholder("Start typing an address...").fill("100 Test Rd, Charleston, SC 29401");
    await page.getByRole("button", { name: "Continue" }).click();

    // County
    await page.getByPlaceholder("Dorchester").fill("Charleston");
    await page.getByRole("button", { name: "Continue" }).click();

    // First tenant
    await page.getByPlaceholder("John Doe").fill("Tenant One");
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for the "Add another tenant?" step to render
    await expect(
      page.getByRole("heading", { name: "Add another tenant?" })
    ).toBeVisible();

    // Add another? Yes — this loops back to tenantName step
    await page.getByRole("button", { name: /Yes/i }).click();

    // Should loop back to tenant name input
    const tenantInput = page.getByPlaceholder("John Doe");
    await expect(tenantInput).toBeVisible({ timeout: 5000 });

    // Second tenant
    await tenantInput.fill("Tenant Two");
    await page.getByRole("button", { name: "Continue" }).click();

    // Add another? No this time
    await page.getByRole("button", { name: /No/i }).click();

    // Should proceed to lease start date (no longer county — county is before tenants now)
    await expect(
      page.getByRole("heading", { name: "When does the lease start?" })
    ).toBeVisible();
  });

  test("custom lease term shows month input", async ({ page }) => {
    await fillEarlySteps(page);

    // Lease start date — click a future date on the calendar
    await expect(
      page.getByRole("heading", { name: "When does the lease start?" })
    ).toBeVisible();
    // Click any enabled day button on the calendar
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();

    // Wait for auto-advance to lease term length
    await expect(
      page.getByRole("heading", { name: "How long is the lease?" })
    ).toBeVisible();

    // Choose Custom Length
    await page.getByRole("button", { name: "Custom Length" }).click();

    // Should show custom months input
    await expect(
      page.getByRole("heading", { name: "How many months?" })
    ).toBeVisible();

    // Use the + button to set months
    const plusBtn = page.getByRole("button", { name: "Increase" });
    for (let i = 0; i < 9; i++) {
      await plusBtn.click();
    }

    // Verify counter shows 9
    await expect(page.locator(".text-5xl")).toHaveText("9");

    await page.getByRole("button", { name: "Continue" }).click();

    // Should proceed to monthly rent
    await expect(
      page.getByRole("heading", { name: "Monthly rent amount?" })
    ).toBeVisible();
  });

  test("6 month lease skips custom length", async ({ page }) => {
    await fillEarlySteps(page);

    // Lease start date
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();

    await expect(
      page.getByRole("heading", { name: "How long is the lease?" })
    ).toBeVisible();

    // Choose 6 Months
    await page.getByRole("button", { name: "6 Months" }).click();

    // Should skip straight to monthly rent (no custom months step)
    await expect(
      page.getByRole("heading", { name: "Monthly rent amount?" })
    ).toBeVisible();
  });

  test("security deposit matching rent skips deposit input", async ({ page }) => {
    await fillEarlySteps(page);

    // Date
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();

    // Lease term: 12 months
    await page.getByRole("button", { name: "12 Months" }).click();

    // Monthly rent
    await expect(
      page.getByRole("heading", { name: "Monthly rent amount?" })
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("1500");
    await page.getByRole("button", { name: "Continue" }).click();

    // Security deposit matches rent? Yes
    await expect(
      page.getByRole("heading", { name: "Security deposit same as rent?" })
    ).toBeVisible();
    await page.getByRole("button", { name: /Yes/i }).click();

    // Should skip deposit amount and go straight to keys
    await expect(
      page.getByRole("heading", { name: "How many keys?" })
    ).toBeVisible();
  });

  test("security deposit NOT matching rent shows deposit input", async ({ page }) => {
    await fillEarlySteps(page);

    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();

    await page.getByRole("button", { name: "12 Months" }).click();

    await page.locator('input[inputmode="numeric"]').fill("1500");
    await page.getByRole("button", { name: "Continue" }).click();

    // Security deposit matches rent? No
    await page.getByRole("button", { name: /No/i }).click();

    // Should show security deposit input
    await expect(
      page.getByRole("heading", { name: "Security deposit amount?" })
    ).toBeVisible();

    await page.locator('input[inputmode="numeric"]').fill("2000");
    await page.getByRole("button", { name: "Continue" }).click();

    // Now should proceed to keys
    await expect(
      page.getByRole("heading", { name: "How many keys?" })
    ).toBeVisible();
  });

  test("pets yes shows deposit and rent, pets no skips to utilities", async ({ page }) => {
    await fillEarlySteps(page);

    // Quick-advance through date, term, financials, keys, extra items, occupancy
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();
    await page.getByRole("button", { name: "12 Months" }).click();
    await page.locator('input[inputmode="numeric"]').fill("1200");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Yes/i }).click(); // deposit matches rent

    // Keys (4 integer steps) — must set to explicit 0 so validation passes
    for (let i = 0; i < 4; i++) {
      await setIntegerToZero(page);
      await page.getByRole("button", { name: "Continue" }).click();
    }

    // Any extra items? No
    await page.getByRole("button", { name: /No/i }).click();

    // Max occupants — set to explicit 0
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // Will there be any pets? Yes
    await expect(
      page.getByRole("heading", { name: "Will there be any pets?" })
    ).toBeVisible();
    await page.getByRole("button", { name: /Yes/i }).click();

    // Pet deposit
    await expect(
      page.getByRole("heading", { name: "Pet deposit amount?" })
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("300");
    await page.getByRole("button", { name: "Continue" }).click();

    // Monthly pet rent
    await expect(
      page.getByRole("heading", { name: "Monthly pet rent?" })
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("25");
    await page.getByRole("button", { name: "Continue" }).click();

    // Should now be on utilities
    await expect(
      page.getByRole("heading", { name: "Is water included?" })
    ).toBeVisible();
  });

  test("no pets skips pet deposit and rent", async ({ page }) => {
    await fillEarlySteps(page);

    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();
    await page.getByRole("button", { name: "12 Months" }).click();
    await page.locator('input[inputmode="numeric"]').fill("1200");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Yes/i }).click(); // deposit matches

    // Keys — set each to explicit 0
    for (let i = 0; i < 4; i++) {
      await setIntegerToZero(page);
      await page.getByRole("button", { name: "Continue" }).click();
    }

    await page.getByRole("button", { name: /No/i }).click(); // no extra items

    // Max occupants — set to explicit 0
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // Pets? No
    await page.getByRole("button", { name: /No/i }).click();

    // Should skip straight to utilities
    await expect(
      page.getByRole("heading", { name: "Is water included?" })
    ).toBeVisible();
  });
});
