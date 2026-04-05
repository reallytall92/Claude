import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { chartOfAccounts, bankFormats } from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/books.db",
});

const db = drizzle(client);

const defaultAccounts = [
  // Assets (1000s)
  {
    code: "1010",
    name: "Checking Account",
    friendlyName: "Checking Account",
    description: "Your main business checking account",
    type: "asset" as const,
    group: "Bank Accounts",
  },
  {
    code: "1020",
    name: "Savings Account",
    friendlyName: "Savings Account",
    description: "Your business savings account",
    type: "asset" as const,
    group: "Bank Accounts",
  },
  {
    code: "1500",
    name: "Equipment",
    friendlyName: "Equipment",
    description: "Business equipment you own (computers, medical devices, etc.)",
    type: "asset" as const,
    group: "Property & Equipment",
  },
  {
    code: "1510",
    name: "Accumulated Depreciation",
    friendlyName: "Equipment Wear & Tear",
    description:
      "The total amount your equipment has decreased in value over time",
    type: "asset" as const,
    group: "Property & Equipment",
  },

  // Liabilities (2000s)
  {
    code: "2010",
    name: "Credit Card Payable",
    friendlyName: "Credit Card Balance",
    description: "What you owe on your business credit card",
    type: "liability" as const,
    group: "Money You Owe",
  },
  {
    code: "2020",
    name: "Payroll Taxes Payable",
    friendlyName: "Payroll Taxes Owed",
    description: "Payroll taxes that have been recorded but not yet paid",
    type: "liability" as const,
    group: "Money You Owe",
  },

  // Equity (3000s)
  {
    code: "3010",
    name: "Common Stock",
    friendlyName: "Initial Investment",
    description: "Money you originally put into the company when it was formed",
    type: "equity" as const,
    group: "Owner's Equity",
  },
  {
    code: "3020",
    name: "Additional Paid-In Capital",
    friendlyName: "Additional Investment",
    description: "Any additional money you've invested in the company",
    type: "equity" as const,
    group: "Owner's Equity",
  },
  {
    code: "3030",
    name: "Retained Earnings / AAA",
    friendlyName: "Prior Year Profits",
    description:
      "Business profits from prior years that stayed in the company",
    type: "equity" as const,
    group: "Owner's Equity",
  },
  {
    code: "3040",
    name: "Shareholder Distributions",
    friendlyName: "Shareholder Distributions",
    description:
      "Money you take out of the business beyond your salary (transfers to personal accounts)",
    type: "equity" as const,
    group: "Owner's Equity",
  },

  // Income (4000s)
  {
    code: "4010",
    name: "Professional Services - 1099 Contract",
    friendlyName: "Contract Income",
    description:
      "Money earned from your CRNA contract work (1099 payments from staffing agencies)",
    type: "income" as const,
    group: "Income",
  },

  // Expenses (5000s)
  {
    code: "5010",
    name: "Owner Salary (W-2)",
    friendlyName: "Your Salary",
    description:
      "Your W-2 salary paid through payroll (Gusto/ADP). This is your 'reasonable compensation'",
    type: "expense" as const,
    group: "Salary & Payroll",
  },
  {
    code: "5020",
    name: "Payroll Taxes - Employer",
    friendlyName: "Employer Payroll Taxes",
    description:
      "The employer half of Social Security, Medicare, and unemployment taxes",
    type: "expense" as const,
    group: "Salary & Payroll",
  },
  {
    code: "5030",
    name: "Malpractice Insurance",
    friendlyName: "Malpractice Insurance",
    description: "Your annual professional liability insurance policy",
    type: "expense" as const,
    group: "Insurance & Licenses",
  },
  {
    code: "5040",
    name: "Licensing & Certification",
    friendlyName: "Licenses & Certifications",
    description:
      "State nursing board license renewals, NBCRNA certification, DEA registration",
    type: "expense" as const,
    group: "Insurance & Licenses",
  },
  {
    code: "5050",
    name: "Continuing Education (CEUs)",
    friendlyName: "Continuing Education",
    description: "CEU courses, conferences, and training to maintain your license",
    type: "expense" as const,
    group: "Education & Dues",
  },
  {
    code: "5060",
    name: "Professional Dues (AANA, etc.)",
    friendlyName: "Professional Dues",
    description:
      "Membership dues for AANA, state associations, and other professional organizations",
    type: "expense" as const,
    group: "Education & Dues",
  },
  {
    code: "5070",
    name: "Health Insurance Premiums",
    friendlyName: "Health Insurance",
    description:
      "Health, dental, and vision insurance premiums paid by the company",
    type: "expense" as const,
    group: "Insurance & Licenses",
  },
  {
    code: "5080",
    name: "Retirement Plan Contributions",
    friendlyName: "Retirement Contributions",
    description:
      "SEP-IRA, Solo 401(k), or other retirement plan contributions made by the company",
    type: "expense" as const,
    group: "Salary & Payroll",
  },
  {
    code: "5090",
    name: "Home Office",
    friendlyName: "Home Office",
    description:
      "Home office deduction — portion of rent/mortgage, utilities, and internet used for business",
    type: "expense" as const,
    group: "Office & Tech",
  },
  {
    code: "5100",
    name: "Phone & Internet",
    friendlyName: "Phone & Internet",
    description: "Business portion of your phone and internet service",
    type: "expense" as const,
    group: "Office & Tech",
  },
  {
    code: "5110",
    name: "Software & Subscriptions",
    friendlyName: "Software & Subscriptions",
    description:
      "Business software, apps, and subscriptions (scheduling tools, cloud storage, etc.)",
    type: "expense" as const,
    group: "Office & Tech",
  },
  {
    code: "5120",
    name: "Professional Supplies",
    friendlyName: "Supplies",
    description:
      "Medical supplies, scrubs, stethoscopes, and other professional equipment",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5130",
    name: "Legal & Professional Fees",
    friendlyName: "Legal & Professional Fees",
    description:
      "CPA fees, attorney fees, tax preparation, and other professional services",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5140",
    name: "Bank Fees & Charges",
    friendlyName: "Bank Fees",
    description: "Monthly service fees, wire transfer fees, and other bank charges",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5150",
    name: "Meals & Entertainment",
    friendlyName: "Meals & Entertainment",
    description:
      "Business meals and entertainment (50% deductible — this will be flagged on your reports)",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5160",
    name: "Travel",
    friendlyName: "Travel",
    description:
      "Business travel expenses — flights, hotels, rental cars, and mileage",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5170",
    name: "Accountable Plan Reimbursements",
    friendlyName: "Business Reimbursements",
    description:
      "Reimbursements to yourself for business expenses paid personally (under an accountable plan)",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5180",
    name: "Miscellaneous",
    friendlyName: "Other Expenses",
    description:
      "Business expenses that don't fit into any other category. Try to use a specific category when possible",
    type: "expense" as const,
    group: "Other Expenses",
  },
  {
    code: "5190",
    name: "Gusto/Payroll Service Fees",
    friendlyName: "Payroll Service Fees",
    description:
      "Monthly fees charged by Gusto, ADP, or other payroll services for processing your payroll",
    type: "expense" as const,
    group: "Salary & Payroll",
  },
];

async function seed() {
  console.log("Seeding chart of accounts...");

  // Check if already seeded
  const existing = await db.select().from(chartOfAccounts).limit(1);
  if (existing.length > 0) {
    console.log("Chart of accounts already seeded, skipping.");
    return;
  }

  await db.insert(chartOfAccounts).values(
    defaultAccounts.map((a) => ({
      ...a,
      isDefault: true,
      isActive: true,
    }))
  );

  console.log(`Seeded ${defaultAccounts.length} accounts.`);

  // Seed bank formats
  await db.insert(bankFormats).values([
    {
      bankName: "Chase",
      parserKey: "chase",
      description:
        "JPMorgan Chase accessible PDF statements with *start*/*end* section markers",
    },
  ]);

  console.log("Seeded bank formats.");
  console.log("Done!");
}

seed().catch(console.error);
