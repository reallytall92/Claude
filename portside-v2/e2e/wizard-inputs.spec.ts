import { test, expect } from "@playwright/test";

test.describe("Wizard Input Components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lease");
    // Wait for first step to render
    await expect(
      page.getByRole("heading", { name: "What's the property address?" })
    ).toBeVisible();
  });

  test("address input: validates minimum length and submits", async ({ page }) => {
    const input = page.getByPlaceholder("Start typing an address...");
    await expect(input).toBeVisible();

    // Continue button should be disabled with empty input
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();

    // Type less than 5 chars (propertyAddress requires >= 5)
    await input.fill("123");
    await expect(continueBtn).toBeDisabled();

    // Type valid address
    await input.fill("123 Main St");
    await expect(continueBtn).toBeEnabled();

    // Click continue to advance
    await continueBtn.click();

    // Should advance to county step (new flow: address → county → tenant)
    await expect(
      page.getByRole("heading", { name: "What county is this property in?" })
    ).toBeVisible();
  });

  test("address input: Enter key submits when valid", async ({ page }) => {
    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456 Oak Ave, Charleston, SC 29401");
    await input.press("Enter");

    await expect(
      page.getByRole("heading", { name: "What county is this property in?" })
    ).toBeVisible();
  });

  test("yes/no input: auto-advances on selection", async ({ page }) => {
    // Navigate through: address → county → tenant → addAnotherTenant
    await page.getByPlaceholder("Start typing an address...").fill("123 Main St, City, SC 29485");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("Dorchester").fill("Test County");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("John Doe").fill("Jane Smith");
    await page.getByRole("button", { name: "Continue" }).click();

    // Now on "Add another tenant?" yes/no step
    await expect(
      page.getByRole("heading", { name: "Add another tenant?" })
    ).toBeVisible();

    // No continue button for yes/no (auto-advance)
    await expect(page.getByRole("button", { name: "Continue" })).not.toBeVisible();

    // Click No — should advance to lease start date
    await page.getByRole("button", { name: /No/i }).click();

    await expect(
      page.getByRole("heading", { name: "When does the lease start?" })
    ).toBeVisible();
  });

  test("back navigation works", async ({ page }) => {
    // Fill first step and advance
    await page.getByPlaceholder("Start typing an address...").fill("123 Main St, City, SC 29485");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("heading", { name: "What county is this property in?" })
    ).toBeVisible();

    // Back button should be visible (not on first step anymore)
    const backBtn = page.getByRole("button", { name: "Go back" });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Should go back to property address
    await expect(
      page.getByRole("heading", { name: "What's the property address?" })
    ).toBeVisible();

    // Value should be preserved
    const input = page.getByPlaceholder("Start typing an address...");
    await expect(input).toHaveValue("123 Main St, City, SC 29485");
  });

  test("first step has no back button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Go back" })).not.toBeVisible();
  });

  test("progress bar increases as steps advance", async ({ page }) => {
    // Check initial progress bar exists
    const progressBar = page.locator(".bg-primary.rounded-full.h-full");
    await expect(progressBar).toBeVisible();

    // Advance through first few steps: address → county → tenant → addAnother
    await page.getByPlaceholder("Start typing an address...").fill("123 Main St, City, SC 29485");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("Dorchester").fill("Test County");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("John Doe").fill("Test Tenant");
    await page.getByRole("button", { name: "Continue" }).click();

    // Click No on add another tenant
    await page.getByRole("button", { name: /No/i }).click();

    // Now on lease start date — progress should have increased
    await expect(
      page.getByRole("heading", { name: "When does the lease start?" })
    ).toBeVisible();
  });
});
