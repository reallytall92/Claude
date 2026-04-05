import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "1",
    title: "Upload your Chase statement",
    when: "Once a month, after your statement closes",
    description:
      "Go to chase.com, download your business checking statement as an Accessible PDF, then upload it on the Upload Statement page. The app reads the PDF and pulls in every transaction automatically.",
    tips: [
      "Chase statements usually close at the end of the month",
      'Use the "Accessible PDF" option when downloading — it\'s the format the parser understands',
      "Do the same for savings and credit card statements if you have them",
    ],
  },
  {
    number: "2",
    title: "Classify your transactions",
    when: "Right after uploading, or whenever you have a few minutes",
    description:
      "Each transaction needs a category so your books are accurate. Go to the Transactions page and assign a category to anything marked \"Needs Review.\" Most of these will be straightforward.",
    tips: [
      "Contract income from the hospital or agency goes under Professional Services - 1099 Contract",
      "Your Gusto payroll debits get classified as Owner Salary and Payroll Taxes",
      "Transfers to your personal account are Shareholder Distributions — these are not expenses",
      "When you classify something, you can save a rule so similar transactions auto-classify next time",
    ],
  },
  {
    number: "3",
    title: "Review your reports",
    when: "Quarterly to check in, and at tax time for your CPA",
    description:
      "The Reports page generates a Profit & Loss statement and Balance Sheet from your classified transactions. These are the two reports your CPA needs to file your S-Corp tax return (Form 1120-S).",
    tips: [
      "P&L shows your income minus expenses — this is your taxable business profit",
      "Balance Sheet shows what the business owns, owes, and your equity",
      "Run these quarterly so there are no surprises at tax time",
    ],
  },
];

const commonCategories = [
  { transaction: "Direct deposit from hospital/agency", category: "Professional Services - 1099 Contract", type: "Income" },
  { transaction: "Gusto payroll debit (net pay)", category: "Owner Salary", type: "Expense" },
  { transaction: "Gusto payroll taxes", category: "Payroll Taxes", type: "Expense" },
  { transaction: "Transfer to personal checking", category: "Shareholder Distributions", type: "Equity" },
  { transaction: "Malpractice insurance premium", category: "Malpractice Insurance", type: "Expense" },
  { transaction: "State nursing license renewal", category: "Licenses & Certifications", type: "Expense" },
  { transaction: "Health/dental insurance premium", category: "Health Insurance Premium", type: "Expense" },
  { transaction: "Gusto monthly fee", category: "Software & Subscriptions", type: "Expense" },
  { transaction: "CPA or legal fees", category: "Professional Fees (CPA/Legal)", type: "Expense" },
  { transaction: "Retirement plan contribution", category: "Retirement Contributions", type: "Expense" },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">How It Works</h1>
        <p className="text-muted-foreground">
          A simple guide to keeping your S-Corp books up to date
        </p>
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm leading-relaxed">
            Bookkeeping for your CRNA S-Corp boils down to one thing:{" "}
            <strong>every dollar in and out of your business bank account needs a label.</strong>{" "}
            That label tells the IRS (and your CPA) whether it was income, a business expense, or
            money you took out as the owner. This app makes that process as painless as possible.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">The Monthly Workflow</h2>
        {steps.map((step) => (
          <Card key={step.number}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.number}
                </div>
                <div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription className="mt-1">{step.when}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pl-[calc(2.25rem+1rem+1.5rem)]">
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              <ul className="space-y-1.5">
                {step.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Common Transaction Categories</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s how to classify the transactions you&apos;ll see most often:
        </p>
        <Card>
          <CardContent className="py-0">
            <div className="divide-y">
              {commonCategories.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.transaction}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm">{item.category}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distributions vs. Expenses</CardTitle>
          <CardDescription>This is the most important distinction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            When you transfer money from your business checking to your personal account, that
            is <strong>not</strong> a business expense. It&apos;s a{" "}
            <strong>shareholder distribution</strong> — you&apos;re taking profit out of the company.
          </p>
          <p>
            Distributions don&apos;t reduce your taxable income. They reduce your equity (ownership stake)
            in the business. Your CPA tracks this on your Schedule M-2 / AAA.
          </p>
          <p>
            Your <strong>salary from Gusto</strong> (the W-2 wages) <em>is</em> a business expense.
            That&apos;s why Gusto payroll debits get classified as Owner Salary — the business is paying
            you as an employee, which reduces taxable business profit.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Time Checklist</CardTitle>
          <CardDescription>What your CPA needs from you</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary shrink-0">1.</span>
              <span>Make sure all transactions for the year are uploaded and classified</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">2.</span>
              <span>Go to Reports and generate a <strong>Profit & Loss</strong> for the full year</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">3.</span>
              <span>Generate a <strong>Balance Sheet</strong> as of December 31</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">4.</span>
              <span>Send both reports to your CPA along with your Gusto year-end tax documents</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
