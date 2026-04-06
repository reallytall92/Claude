import { test, expect } from "@playwright/test";

// Integer inputs default to "" which fails validation.
// Click +/- to set the stored value to "0" so Continue enables.
async function setIntegerToZero(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Increase" }).click();
  await page.getByRole("button", { name: "Decrease" }).click();
}

test.describe("Full Wizard Flow to Review", () => {
  test("complete wizard and verify review screen", async ({ page }) => {
    await page.goto("/lease");

    // ── Property ──
    // Property address
    await page.getByPlaceholder("Start typing an address...").fill("742 Evergreen Terrace, Springfield, SC 29401");
    await page.getByRole("button", { name: "Continue" }).click();

    // County
    await page.getByPlaceholder("Dorchester").fill("Shelby");
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Parties ──
    // Tenant name
    await page.getByPlaceholder("John Doe").fill("Homer Simpson");
    await page.getByRole("button", { name: "Continue" }).click();

    // Add another tenant? No
    await page.getByRole("button", { name: /No/i }).click();

    // ── Term ──
    // Lease start date — pick a date
    await expect(
      page.getByRole("heading", { name: "When does the lease start?" })
    ).toBeVisible();
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();

    // Lease term: 12 months
    await expect(
      page.getByRole("heading", { name: "How long is the lease?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "12 Months" }).click();

    // ── Financials ──
    // Monthly rent
    await expect(
      page.getByRole("heading", { name: "Monthly rent amount?" })
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("1850");
    await page.getByRole("button", { name: "Continue" }).click();

    // Security deposit matches rent? Yes
    await page.getByRole("button", { name: /Yes/i }).click();

    // ── Keys & Access ──
    // Keys — increment to 2
    await expect(
      page.getByRole("heading", { name: "How many keys?" })
    ).toBeVisible();
    const increaseBtn = page.getByRole("button", { name: "Increase" });
    await increaseBtn.click();
    await increaseBtn.click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Garage openers — set to 0 explicitly
    await expect(
      page.getByRole("heading", { name: "Garage door openers?" })
    ).toBeVisible();
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // Mailbox keys — set to 0
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // Pool access cards — set to 0
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Extra Items ──
    // Any extra items? No
    await page.getByRole("button", { name: /No/i }).click();

    // ── Occupancy ──
    // Max occupants — increment to 3
    await expect(
      page.getByRole("heading", { name: "Maximum occupants?" })
    ).toBeVisible();
    const occupantIncrease = page.getByRole("button", { name: "Increase" });
    await occupantIncrease.click();
    await occupantIncrease.click();
    await occupantIncrease.click();
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Pets ──
    // Any pets? No
    await page.getByRole("button", { name: /No/i }).click();

    // ── Utilities (6 yes/no) ──
    // Water — No
    await expect(
      page.getByRole("heading", { name: "Is water included?" })
    ).toBeVisible();
    await page.getByRole("button", { name: /No/i }).click();

    // Sewer — No
    await page.getByRole("button", { name: /No/i }).click();

    // Electric — No
    await page.getByRole("button", { name: /No/i }).click();

    // Gas — No
    await page.getByRole("button", { name: /No/i }).click();

    // Trash — Yes
    await page.getByRole("button", { name: /Yes/i }).click();

    // Internet — No
    await page.getByRole("button", { name: /No/i }).click();

    // Any other utilities? No
    await page.getByRole("button", { name: /No/i }).click();

    // ── Appliances (8 yes/no) ──
    // Stove — Yes
    await expect(
      page.getByRole("heading", { name: "Is a stove provided?" })
    ).toBeVisible();
    await page.getByRole("button", { name: /Yes/i }).click();

    // Refrigerator — Yes
    await page.getByRole("button", { name: /Yes/i }).click();

    // Dishwasher — Yes
    await page.getByRole("button", { name: /Yes/i }).click();

    // Garbage disposal — No
    await page.getByRole("button", { name: /No/i }).click();

    // Washer — No
    await page.getByRole("button", { name: /No/i }).click();

    // Dryer — No
    await page.getByRole("button", { name: /No/i }).click();

    // Microwave — Yes
    await page.getByRole("button", { name: /Yes/i }).click();

    // Trash compactor — No
    await page.getByRole("button", { name: /No/i }).click();

    // Any other appliances? No
    await page.getByRole("button", { name: /No/i }).click();

    // ── Additional Terms ──
    await expect(
      page.getByRole("heading", { name: "Any additional terms?" })
    ).toBeVisible();
    await page.getByRole("textbox").fill("No smoking on premises. Late fee of $50 after the 5th.");
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Review Screen ──
    await expect(
      page.getByRole("heading", { name: "Review your lease" })
    ).toBeVisible();
    await expect(
      page.getByText("Double-check everything before generating.")
    ).toBeVisible();

    // Verify key data on review
    await expect(page.getByText("Homer Simpson")).toBeVisible();
    await expect(page.getByText("742 Evergreen Terrace, Springfield, SC 29401")).toBeVisible();
    await expect(page.getByText("Shelby County")).toBeVisible();
    await expect(page.getByText("12 months")).toBeVisible();
    // Rent and deposit both show $1,850 (deposit matches rent), so use first()
    await expect(page.getByText("$1,850").first()).toBeVisible();
    await expect(page.getByText("No pets")).toBeVisible();
    await expect(page.getByText("Trash")).toBeVisible();
    await expect(page.getByText(/Stove.*Refrigerator.*Dishwasher.*Microwave/)).toBeVisible();
    await expect(page.getByText("No smoking on premises")).toBeVisible();

    // Generate button should be disabled (coming soon)
    const generateBtn = page.getByRole("button", { name: /Generate Lease PDF/i });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();
    await expect(page.getByText("PDF generation coming soon")).toBeVisible();

    // Edit buttons should be present for each section
    const editButtons = page.getByRole("button", { name: "Edit" });
    await expect(editButtons).toHaveCount(11); // one per section
  });

  test("review edit button navigates back to section", async ({ page }) => {
    await page.goto("/lease");

    // Speed through the wizard with minimal input
    await page.getByPlaceholder("Start typing an address...").fill("100 Quick St, Test, SC 29401");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByPlaceholder("Dorchester").fill("Test");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByPlaceholder("John Doe").fill("Quick Tenant");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /No/i }).click(); // no more tenants

    // Date
    const dayButtons = page.locator("table button:not([disabled])");
    await dayButtons.last().click();
    await page.getByRole("button", { name: "12 Months" }).click();

    // Rent
    await page.locator('input[inputmode="numeric"]').fill("1000");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Yes/i }).click(); // deposit matches

    // Keys (4 integer steps) — set each to 0 explicitly
    for (let i = 0; i < 4; i++) {
      await setIntegerToZero(page);
      await page.getByRole("button", { name: "Continue" }).click();
    }

    await page.getByRole("button", { name: /No/i }).click(); // no extra items

    // Occupants — set to 0
    await setIntegerToZero(page);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: /No/i }).click(); // no pets

    // 6 utilities + any other
    for (let i = 0; i < 7; i++) {
      await page.getByRole("button", { name: /No/i }).click();
    }

    // 8 appliances + any other
    for (let i = 0; i < 9; i++) {
      await page.getByRole("button", { name: /No/i }).click();
    }

    // Additional terms
    await page.getByRole("button", { name: "Continue" }).click();

    // Should be on review
    await expect(
      page.getByRole("heading", { name: "Review your lease" })
    ).toBeVisible();

    // Click the first Edit button (goes to property section = propertyAddress)
    const editButtons = page.getByRole("button", { name: "Edit" });
    await editButtons.first().click();

    // Should navigate back into the wizard (first section = property = propertyAddress)
    // SECTION_FIRST_STEP["property"] = "propertyAddress"
    await expect(
      page.getByRole("heading", { name: "What's the property address?" })
    ).toBeVisible();
  });
});
