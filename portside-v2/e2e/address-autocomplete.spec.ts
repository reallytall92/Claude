import { test, expect } from "@playwright/test";

const MOCK_PREDICTIONS = [
  { placeId: "place_1", description: "456 Richfield Way, Moncks Corner, SC 29461" },
  { placeId: "place_2", description: "4565 Gaynor Avenue, North Charleston, SC 29405" },
  { placeId: "place_3", description: "456 Four Seasons Boulevard, Summerville, SC 29485" },
];

const MOCK_DETAILS_WITH_COUNTY = {
  county: "Berkeley",
  formattedAddress: "456 Richfield Way, Moncks Corner, SC 29461, USA",
};

const MOCK_DETAILS_NO_COUNTY = {
  county: "",
  formattedAddress: "456 Test St, Nowhere, SC 29000, USA",
};

test.describe("Address Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the autocomplete API
    await page.route("**/api/places/autocomplete*", async (route) => {
      const url = new URL(route.request().url());
      const input = url.searchParams.get("input") ?? "";
      if (input.length >= 3) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ predictions: MOCK_PREDICTIONS }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ predictions: [] }),
        });
      }
    });

    await page.goto("/lease");
    await expect(
      page.getByRole("heading", { name: "What's the property address?" })
    ).toBeVisible();
  });

  test("shows dropdown suggestions as user types", async ({ page }) => {
    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456");

    // Wait for debounced fetch and dropdown to appear
    const listbox = page.locator("#address-listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Should show all mock predictions
    await expect(listbox.getByRole("option")).toHaveCount(3);
    await expect(listbox.getByText("456 Richfield Way")).toBeVisible();
    await expect(listbox.getByText("4565 Gaynor Avenue")).toBeVisible();
    await expect(listbox.getByText("456 Four Seasons Boulevard")).toBeVisible();
  });

  test("selecting a suggestion fills the address and auto-populates county", async ({ page }) => {
    // Mock the details endpoint to return a county
    await page.route("**/api/places/details*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DETAILS_WITH_COUNTY),
      });
    });

    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456");

    // Wait for dropdown
    const listbox = page.locator("#address-listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Click first suggestion
    await listbox.getByRole("option").first().click();

    // Address should be filled
    await expect(input).toHaveValue("456 Richfield Way, Moncks Corner, SC 29461");

    // Dropdown should close
    await expect(listbox).not.toBeVisible();

    // Advance to county step
    await page.getByRole("button", { name: "Continue" }).click();

    // County should be auto-populated with "Berkeley"
    await expect(
      page.getByRole("heading", { name: "What county is this property in?" })
    ).toBeVisible();
    const countyInput = page.getByPlaceholder("Dorchester");
    await expect(countyInput).toHaveValue("Berkeley");
  });

  test("county step allows manual entry when no county returned", async ({ page }) => {
    // Mock the details endpoint to return no county
    await page.route("**/api/places/details*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DETAILS_NO_COUNTY),
      });
    });

    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456");

    const listbox = page.locator("#address-listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await listbox.getByRole("option").first().click();

    await page.getByRole("button", { name: "Continue" }).click();

    // County should be empty — user must enter manually
    const countyInput = page.getByPlaceholder("Dorchester");
    await expect(countyInput).toHaveValue("");

    // Continue should be disabled until county is entered
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();

    // Type a county manually
    await countyInput.fill("Custom County");
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Should advance to tenant name
    await expect(
      page.getByRole("heading", { name: "Tenant's full name?" })
    ).toBeVisible();
  });

  test("keyboard navigation works in dropdown", async ({ page }) => {
    await page.route("**/api/places/details*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DETAILS_WITH_COUNTY),
      });
    });

    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456");

    const listbox = page.locator("#address-listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Arrow down to first item
    await input.press("ArrowDown");
    const firstOption = listbox.getByRole("option").first();
    await expect(firstOption).toHaveAttribute("aria-selected", "true");

    // Arrow down to second item
    await input.press("ArrowDown");
    const secondOption = listbox.getByRole("option").nth(1);
    await expect(secondOption).toHaveAttribute("aria-selected", "true");

    // Press Enter to select
    await input.press("Enter");

    // Should fill with the second suggestion
    await expect(input).toHaveValue("4565 Gaynor Avenue, North Charleston, SC 29405");
    await expect(listbox).not.toBeVisible();
  });

  test("escape closes the dropdown", async ({ page }) => {
    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("456");

    const listbox = page.locator("#address-listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    await input.press("Escape");
    await expect(listbox).not.toBeVisible();
  });

  test("dropdown does not show for input shorter than 3 characters", async ({ page }) => {
    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("45");

    // Give time for any fetch to happen
    await page.waitForTimeout(500);

    const listbox = page.locator("#address-listbox");
    await expect(listbox).not.toBeVisible();
  });

  test("manual address entry without autocomplete still works", async ({ page }) => {
    // User types a full address manually without selecting from dropdown
    const input = page.getByPlaceholder("Start typing an address...");
    await input.fill("789 Manual Entry Dr, Anywhere, SC 29000");

    // Close any dropdown that might appear
    await input.press("Escape");

    // Should be able to continue
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // County should be empty (no autocomplete selection was made)
    await expect(
      page.getByRole("heading", { name: "What county is this property in?" })
    ).toBeVisible();
    const countyInput = page.getByPlaceholder("Dorchester");
    await expect(countyInput).toHaveValue("");
  });
});
