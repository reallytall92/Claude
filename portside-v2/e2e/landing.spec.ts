import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders logo, title, tagline, and CTA", async ({ page }) => {
    await page.goto("/");

    // Title
    await expect(page.getByRole("heading", { name: "Portside" })).toBeVisible();

    // Tagline
    await expect(
      page.getByText("Generate lease agreements in minutes, not hours.")
    ).toBeVisible();

    // Time estimate
    await expect(
      page.getByText("Takes about 3 minutes to complete")
    ).toBeVisible();

    // CTA button
    const cta = page.getByRole("link", { name: /Start New Lease/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/lease");
  });

  test("CTA navigates to the lease wizard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start New Lease/i }).click();
    await expect(page).toHaveURL("/lease");

    // First wizard step should be visible
    await expect(
      page.getByRole("heading", { name: "What's the property address?" })
    ).toBeVisible();
  });
});
