# S-Corp PLLC Bookkeeping App — Implementation Plan

## Context

A single-member Texas CRNA PLLC (S-Corp election) needs a self-service bookkeeping tool that eliminates the need for a CPA to maintain basic books. Revenue is $250K–$500K/year, which triggers the IRS Schedule L (Balance Sheet) requirement on Form 1120-S. Payroll is already handled externally (Gusto/ADP). The goal is to upload bank statements (PDF only), manually classify each transaction with heavy UX guidance, and export a complete professional financial package at year-end.

**Core UX principle:** The user is NOT a CPA. Every step must be explained in plain English. No accounting jargon exposed to the user. The app guides them through every action like a knowledgeable assistant, not a blank spreadsheet. Stack matches the existing nutrition tracker project (Next.js, SQLite, Drizzle, Tailwind).

---

## What the User Is Not Thinking About (CPA's First Questions)

These must be addressed in the app's setup flow, not after-the-fact:

1. **Accounting method** — Cash basis (income when received, expense when paid) is correct for this entity. Accrual would be wrong. This is a one-time setup choice.
2. **Opening balances from prior tax returns** — Without entering prior year ending equity (retained earnings / AAA from last 1120-S), the Balance Sheet will be wrong. The setup wizard should walk the user through entering these numbers from their most recent return.
3. **Credit cards are liabilities, not direct expenses** — Credit card transactions are expenses, but paying off the card is NOT an expense — it's a liability reduction. The app must handle this correctly or the books will be overstated.
4. **Payroll journal entries** — Gusto handles payroll processing, but each payroll run must be recorded in the books (salary expense + payroll tax expense → reduces bank balance). The app needs a simple payroll entry form or Gusto CSV import.
5. **Shareholder distributions vs. salary** — Any money moved from business to personal beyond W-2 salary is a distribution (draws against equity / AAA), NOT an additional salary. These must be tracked separately.
6. **Bank reconciliation is required** — The books must be formally reconciled against each statement period before closing the month. This is what proves the books are accurate.
7. **Texas Franchise Tax** — Below the $2.65M no-tax-due threshold, so no tax owed, but the entity still must file a Public Information Report (Form 05-102) by May 15. The app should remind the user and provide the revenue data needed.
8. **Year-end closing** — Net income for the year must be rolled into Accumulated Adjustments Account (AAA / retained earnings) on Dec 31. The app handles this automatically.

---

## Tech Stack

Matches the nutrition tracker to minimize context switching:

- **Framework**: Next.js 16 App Router (Vercel)
- **Database**: SQLite via `better-sqlite3` + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS v4 (premium, clean)
- **PDF Parsing**: `pdf-parse` for bank statement PDFs (only supported format)
- **PDF Generation**: `@react-pdf/renderer` for professional report output
- **File storage**: Local filesystem (statements stored in `/data/statements/`)
- **Hosting**: Vercel

---

## Database Schema

```
companies              — name, EIN, state (TX), fiscal year, accounting method, formation date
chart_of_accounts      — id, code, name, type (asset/liability/equity/income/expense), parent_id, is_default, notes
bank_accounts          — id, name, type (checking/savings/credit_card), institution, last4, current_balance
transactions           — id, date, amount, description, raw_description, account_id, category_id, type (debit/credit), source (upload/manual), classification_source (manual/rule), reconciled, notes
statement_uploads      — id, filename, account_id, period_start, period_end, uploaded_at, parsed_count, status
classification_rules   — id, pattern (regex or substring), category_id, priority, created_from_transaction_id
journal_entries        — id, date, memo, type (payroll/distribution/depreciation/opening_balance/adjustment), created_at
journal_entry_lines    — id, journal_entry_id, account_id, debit, credit, memo
settings               — key, value (fiscal_year_start, company_info, etc.)
```

---

## Chart of Accounts — Pre-Seeded for CRNA S-Corp

**Assets (1000s)**
- 1010 Checking Account
- 1020 Savings Account
- 1500 Equipment (gross)
- 1510 Accumulated Depreciation

**Liabilities (2000s)**
- 2010 Credit Card Payable
- 2020 Payroll Taxes Payable

**Equity (3000s)**
- 3010 Common Stock
- 3020 Additional Paid-In Capital
- 3030 Retained Earnings / AAA (prior years)
- 3040 Shareholder Distributions (current year)

**Income (4000s)**
- 4010 Professional Services — 1099 Contract

**Expenses (5000s)**
- 5010 Owner Salary (W-2)
- 5020 Payroll Taxes — Employer
- 5030 Malpractice Insurance
- 5040 Licensing & Certification
- 5050 Continuing Education (CEUs)
- 5060 Professional Dues (AANA, etc.)
- 5070 Health Insurance Premiums
- 5080 Retirement Plan Contributions
- 5090 Home Office
- 5100 Phone & Internet
- 5110 Software & Subscriptions
- 5120 Professional Supplies
- 5130 Legal & Professional Fees
- 5140 Bank Fees & Charges
- 5150 Meals & Entertainment (50% deductible — flagged in reports)
- 5160 Travel
- 5170 Accountable Plan Reimbursements
- 5180 Miscellaneous

---

## App Structure & Pages

### `/` — Dashboard
- YTD income, expenses, net income cards
- Cash position (checking + savings - credit card balance)
- Unclassified transaction count with action prompt ("You have 12 transactions to review")
- Monthly P&L sparkline chart
- Quick links: Upload Statement, Review Queue

### `/setup` — One-Time Setup Wizard (shown on first run)
1. Company info (name, EIN, state, fiscal year)
2. Opening balances from prior tax return (equity section: retained earnings/AAA, common stock, any outstanding liabilities)
3. Bank account registration

### `/accounts` — Account Management
- List all registered accounts
- View current balance per account
- Add/edit account details

### `/transactions` — Transaction Hub
- Upload statement (drag-drop PDF, auto-detect account)
- Tabbed view: All / Needs Review / Reconciled
- Filters: account, date range, category, amount range
- Inline category picker with search
- "Save this rule" button — auto-classify same merchant in future uploads
- Reconciliation mode: check off transactions against a statement, lock when done

### `/payroll` — Payroll Entries
- Manual entry form: date, gross wages, employer taxes, net payment, bank account
- (Optional) Gusto summary CSV import
- History list of all payroll journal entries

### `/withdrawals` — Owner Withdrawals (plain English for "distributions")
- Record a withdrawal: date, amount, from account
- Shows YTD withdrawals vs. salary
- Running equity balance impact

### `/categories` — Category Management (plain English for "chart of accounts")
- View all categories with friendly name, group, and description
- Add custom category
- Deactivate unused categories (can't delete if transactions exist)

### `/reports` — Report Center

Available reports (all exportable as PDF):
1. **Profit & Loss** — monthly columns + YTD total
2. **Balance Sheet** — point-in-time snapshot (required for Schedule L)
3. **All Transactions** — full ledger by account with running balances
4. **Statement Checkoff Report** — per account, per period (bank reconciliation)
5. **Books Check** — debit/credit totals by account (Trial Balance for CPA use)
6. **Transaction Detail by Category** — categorized transaction list with totals
7. **Year-End Package** — all of the above bundled as one PDF

Report rendering: in-browser preview with clean typography, then PDF export via react-pdf.
Each report page includes a plain-English explanation: *"This is your Profit & Loss report. It shows all money your business earned and spent this year. Your CPA will use this to prepare your tax return."*

### `/settings`
- Company info
- Classification rules management
- Fiscal year / tax year

---

## Transaction Classification UX (Manual, Guided)

No AI classification. Every transaction is classified by the user. The UX must make this feel effortless:

**Category Picker Design:**
- Plain English names only — user never sees account codes (e.g. "Malpractice Insurance" not "5030")
- Each category has a one-sentence description: *"For your annual professional liability policy"*
- Categories organized into friendly groups: "Income", "Insurance & Licenses", "Education & Dues", "Salary & Payroll", "Office & Tech", "Other"
- Search box to filter categories by typing
- "Not sure? Skip for now" button — skips without blocking progress
- Once a merchant has been classified before, **auto-suggest** that same category next time (rule-based) — user can accept with one click or change

**Review Queue Flow:**
1. After uploading a statement, user lands on a focused "Review Transactions" screen
2. Scrollable list with inline category pickers, one row per transaction
3. Progress bar: "12 of 47 transactions classified"
4. Keyword hints: if the description says "AANA" the hint shows *"This looks like a professional dues payment"*
5. Completed transactions get a green checkmark
6. Can exit and return; progress is saved at all times

**Guidance Philosophy:**
- Tooltips on every label that might be confusing
- "What is this?" links throughout that open a plain-English modal explanation
- Report pages include a one-paragraph plain-English summary of what each report means and why it matters
- No jargon in error messages, confirmations, or empty states

---

## PDF Bank Statement Parsing

PDF parsing is bank-specific — we extract text from the PDF and use regex patterns to identify transaction rows (date, description, debit/credit, balance):
- Column-based statement layout (most major banks)
- If extraction fails, show user which page had the error and let them manually enter the transaction
- User maps the column format once per bank; the mapping is saved so future uploads from the same bank just work
- No CSV support (PDF only per user requirement)

---

## Report Output Spec (Professional Grade)

Every PDF report includes:
- Company name, EIN, report period
- Page numbers + generation date
- Formatted as an accountant would produce (clean table, totals, subtotals)
- Balance Sheet: Assets = Liabilities + Equity verified before export
- P&L: Net income ties to Balance Sheet equity change
- Reports are intended to be handed to a CPA or filed alongside Form 1120-S

---

## What This App Will NOT Do

- File taxes (1120-S or Texas franchise tax)
- Calculate reasonable S-Corp salary
- Process payroll
- Handle depreciation automatically (user enters depreciation as a manual entry)
- Multi-user / multi-company

---

## Project Structure

```
/scorp-books/
  app/
    (dashboard)/page.tsx
    accounts/page.tsx
    transactions/page.tsx
    payroll/page.tsx
    withdrawals/page.tsx
    categories/page.tsx
    reports/page.tsx
    settings/page.tsx
    setup/page.tsx
    api/
      transactions/route.ts
      upload/route.ts
      reports/[type]/route.ts   ← generates PDF
      payroll/route.ts
      reconcile/route.ts
  lib/
    db/index.ts                 ← SQLite init + auto-migrate
    db/schema.ts                ← Drizzle schema
    parse-statement.ts          ← PDF parser (pdf-parse + bank-specific regex)
    reports/
      profit-loss.ts
      balance-sheet.ts
      general-ledger.ts
      reconciliation.ts
      trial-balance.ts
    pdf/
      renderer.tsx              ← react-pdf templates
  components/
    transaction-table.tsx
    category-picker.tsx
    upload-dropzone.tsx
    report-preview.tsx
  data/
    statements/                 ← uploaded statement PDFs
    books.db                    ← SQLite database
```

---

## Setup / Onboarding Flow (Critical Path)

On first launch, the app detects no company exists and routes to `/setup`:

1. **Step 1 — Company Info**: Name, EIN, state (TX pre-filled), entity type (S-Corp PLLC pre-filled)
2. **Step 2 — Accounting Method**: Cash basis (pre-selected and recommended, explained in plain English)
3. **Step 3 — Opening Balances**: Guided form with screenshot callouts: *"Open your most recent 1120-S tax return and look for Schedule L. In the 'End of Tax Year' column, find these lines..."* — walks through Retained Earnings / AAA, Common Stock, any equipment values
4. **Step 4 — Add Bank Accounts**: Add checking, savings, credit card with current balances (becomes the Balance Sheet opening cash position)
5. **Done** → redirects to Dashboard with first-use prompts

---

## Verification Plan

1. Upload a sample bank statement PDF → verify transactions parse correctly with date, description, amount
2. Classify several transactions manually → verify category picker works and rule is offered
3. Accept a rule suggestion on a duplicate merchant → verify auto-suggestion works on next upload
4. Record a payroll entry → verify salary + tax expense categories are recorded, bank balance decreases
5. Record an owner withdrawal → verify equity section reflects it
6. Generate P&L → verify net income = income − expenses
7. Generate Balance Sheet → verify Assets = Liabilities + Equity
8. Verify Balance Sheet net income ties to P&L net income for the same period
9. Export Year-End Package PDF → verify it looks professional and complete

---

## Key UX Language Rules (Enforced Throughout)

| Accounting Term | Plain English Used in App |
|---|---|
| Chart of Accounts | Categories |
| General Ledger | All Transactions |
| Trial Balance | Books Check |
| Accumulated Adjustments Account | Business Profits (kept in company) |
| Shareholder Distribution | Owner Withdrawal |
| Journal Entry | Manual Entry |
| Reconciliation | Statement Checkoff |
| Retained Earnings | Prior Year Profits |
| Debit / Credit | Money In / Money Out |

---

## Key Env Vars

None required (no external API calls).
