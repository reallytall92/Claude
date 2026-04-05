"""
S-Corp Books — End-to-End Test with 4 Headed Browsers

Browser 1: Setup wizard (complete all 4 steps)
Browser 2: Browse all pages after setup (dashboard, accounts, categories, settings)
Browser 3: Transactions & payroll workflows
Browser 4: Reports & withdrawals
"""

import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"


async def browser1_setup(playwright):
    """Run through the full setup wizard."""
    browser = await playwright.chromium.launch(
        headless=False,
        args=["--window-position=0,0", "--window-size=720,800"],
    )
    page = await browser.new_page(viewport={"width": 700, "height": 750})
    print("[B1] Starting setup wizard...")

    await page.goto(BASE)
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(1)

    # Should see "Welcome to S-Corp Books" with Start Setup button
    start_btn = page.get_by_role("button", name="Start Setup")
    if await start_btn.is_visible():
        print("[B1] Dashboard shows setup prompt — clicking Start Setup")
        await start_btn.click()
    else:
        await page.goto(f"{BASE}/setup")

    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(1)

    # Step 1: Company Info
    print("[B1] Step 1: Company Info")
    company_input = page.locator("#companyName")
    await company_input.clear()
    await company_input.fill("Venture Anesthesia PLLC")
    await page.locator("#ein").fill("12-3456789")
    await page.locator("#formationDate").fill("2022-06-15")
    await asyncio.sleep(0.5)

    await page.get_by_role("button", name="Continue").click()
    await asyncio.sleep(1)

    # Step 2: Accounting Method (cash is pre-selected)
    print("[B1] Step 2: Accounting Method")
    await asyncio.sleep(0.5)
    await page.get_by_role("button", name="Continue").click()
    await asyncio.sleep(1)

    # Step 3: Opening Balances
    print("[B1] Step 3: Opening Balances")
    await page.locator("#asOfDate").fill("2025-12-31")
    await page.locator("#retainedEarnings").fill("45000")
    await page.locator("#commonStock").fill("100")
    await page.locator("#additionalCapital").fill("0")
    await asyncio.sleep(0.5)

    await page.get_by_role("button", name="Continue").click()
    await asyncio.sleep(1)

    # Step 4: Bank Accounts
    print("[B1] Step 4: Bank Accounts")
    # Fill first account using placeholder-based locators
    await page.locator('input[placeholder="e.g. Chase Business Checking"]').fill("Chase Business Checking")
    await page.locator('input[placeholder="e.g. Chase"]').fill("Chase")
    await page.locator('input[placeholder="6091"]').fill("4521")
    await page.locator('input[placeholder="0.00"]').fill("85000")

    await asyncio.sleep(0.5)

    # Finish setup
    print("[B1] Finishing setup...")
    await page.get_by_role("button", name="Finish Setup").click()
    await asyncio.sleep(2)

    # Should redirect to dashboard
    print("[B1] Setup complete! Checking dashboard...")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Take a screenshot
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/01-dashboard-after-setup.png")
    print("[B1] Dashboard screenshot saved")

    # Keep browser open for viewing
    await asyncio.sleep(30)
    await browser.close()


async def browser2_browse_pages(playwright):
    """Browse all main pages after setup is complete."""
    browser = await playwright.chromium.launch(
        headless=False,
        args=["--window-position=730,0", "--window-size=720,800"],
    )
    page = await browser.new_page(viewport={"width": 700, "height": 750})

    # Wait for setup to complete
    print("[B2] Waiting for setup to complete...")
    await asyncio.sleep(18)

    # Dashboard
    print("[B2] Loading Dashboard...")
    await page.goto(BASE)
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/02-dashboard.png")

    # Accounts
    print("[B2] Loading Accounts...")
    await page.goto(f"{BASE}/accounts")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/03-accounts.png")

    # Categories
    print("[B2] Loading Categories...")
    await page.goto(f"{BASE}/categories")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/04-categories.png")

    # Settings
    print("[B2] Loading Settings...")
    await page.goto(f"{BASE}/settings")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/05-settings.png")

    print("[B2] All pages browsed!")
    await asyncio.sleep(20)
    await browser.close()


async def browser3_transactions(playwright):
    """Test transactions and payroll after setup."""
    browser = await playwright.chromium.launch(
        headless=False,
        args=["--window-position=0,450", "--window-size=720,800"],
    )
    page = await browser.new_page(viewport={"width": 700, "height": 750})

    # Wait for setup
    print("[B3] Waiting for setup to complete...")
    await asyncio.sleep(20)

    # Transactions page
    print("[B3] Loading Transactions...")
    await page.goto(f"{BASE}/transactions")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/06-transactions-empty.png")

    # Add a manual transaction
    print("[B3] Adding manual transaction...")
    add_btn = page.get_by_role("button", name="Add Manually")
    if await add_btn.is_visible():
        await add_btn.click()
        await asyncio.sleep(1)

        # Fill the dialog
        dialog = page.locator("[role='dialog']")
        await dialog.locator("input[type='date']").fill("2026-03-15")
        await dialog.locator("input[type='number']").fill("12500")
        await dialog.locator("input[placeholder='What was this transaction for?']").fill("March contract payment - Memorial Hermann")

        # Change type to income
        type_trigger = dialog.get_by_role("combobox").first
        await type_trigger.click()
        await asyncio.sleep(0.5)
        await page.get_by_role("option", name="Money In (Income)").click()
        await asyncio.sleep(0.5)

        # Select account — click the account combobox
        account_trigger = dialog.get_by_role("combobox").last
        await account_trigger.click()
        await asyncio.sleep(0.5)
        # Pick account by name text
        await page.get_by_role("option", name="Chase Business Checking").click()
        await asyncio.sleep(0.5)

        # Now click Add Transaction
        add_txn_btn = dialog.get_by_role("button", name="Add Transaction")
        try:
            await add_txn_btn.click(timeout=5000)
        except Exception as e:
            print(f"[B3] Add Transaction button issue: {e}")
            await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/07-debug-dialog.png")
        await asyncio.sleep(2)

    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/07-transaction-added.png")

    # Now go to payroll
    print("[B3] Loading Payroll...")
    await page.goto(f"{BASE}/payroll")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/08-payroll.png")

    # Upload page
    print("[B3] Loading Upload page...")
    await page.goto(f"{BASE}/transactions/upload")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/09-upload.png")

    print("[B3] Transactions test done!")
    await asyncio.sleep(15)
    await browser.close()


async def browser4_reports_withdrawals(playwright):
    """Test reports and withdrawals after setup."""
    browser = await playwright.chromium.launch(
        headless=False,
        args=["--window-position=730,450", "--window-size=720,800"],
    )
    page = await browser.new_page(viewport={"width": 700, "height": 750})

    # Wait for setup + transactions
    print("[B4] Waiting for setup to complete...")
    await asyncio.sleep(22)

    # Reports page
    print("[B4] Loading Reports...")
    await page.goto(f"{BASE}/reports")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Generate P&L report
    print("[B4] Generating Profit & Loss report...")
    gen_btn = page.get_by_role("button", name="Generate Report")
    if await gen_btn.is_visible():
        await gen_btn.click()
        await asyncio.sleep(2)

    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/10-profit-loss.png")

    # Switch to Balance Sheet tab
    print("[B4] Generating Balance Sheet...")
    bs_tab = page.get_by_role("tab", name="Balance Sheet")
    if await bs_tab.is_visible():
        await bs_tab.click()
        await asyncio.sleep(1)

        gen_btn2 = page.get_by_role("button", name="Generate Report")
        if await gen_btn2.is_visible():
            await gen_btn2.click()
            await asyncio.sleep(2)

    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/11-balance-sheet.png")

    # Withdrawals
    print("[B4] Loading Withdrawals...")
    await page.goto(f"{BASE}/withdrawals")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)
    await page.screenshot(path="/Users/johnkret/Code/Claude/scorp-books/screenshots/12-withdrawals.png")

    print("[B4] Reports & withdrawals test done!")
    await asyncio.sleep(15)
    await browser.close()


async def main():
    # Create screenshots directory
    import os
    os.makedirs("/Users/johnkret/Code/Claude/scorp-books/screenshots", exist_ok=True)

    async with async_playwright() as p:
        print("Launching 4 headed browsers...")
        print("=" * 50)

        # Launch all 4 browsers concurrently
        await asyncio.gather(
            browser1_setup(p),
            browser2_browse_pages(p),
            browser3_transactions(p),
            browser4_reports_withdrawals(p),
        )

        print("=" * 50)
        print("All tests complete! Screenshots saved to scorp-books/screenshots/")


if __name__ == "__main__":
    asyncio.run(main())
