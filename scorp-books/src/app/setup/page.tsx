"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { title: "Company Info", description: "Tell us about your business" },
  { title: "Accounting Method", description: "How you track income and expenses" },
  { title: "Opening Balances", description: "Numbers from your last tax return" },
  { title: "Bank Accounts", description: "Connect your accounts" },
];

type BankAccountEntry = {
  name: string;
  type: "checking" | "savings" | "credit_card";
  institution: string;
  last4: string;
  currentBalance: string;
};

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("Venture Anesthesia PLLC");
  const [ein, setEin] = useState("");
  const [state, setState] = useState("TX");
  const [entityType, setEntityType] = useState("S-Corp PLLC");
  const [formationDate, setFormationDate] = useState("");

  // Step 2: Accounting Method
  const [accountingMethod, setAccountingMethod] = useState("cash");

  // Step 3: Opening Balances
  const [skipBalances, setSkipBalances] = useState(false);
  const [asOfDate, setAsOfDate] = useState("");
  const [retainedEarnings, setRetainedEarnings] = useState("");
  const [commonStock, setCommonStock] = useState("");
  const [additionalCapital, setAdditionalCapital] = useState("");

  // Step 4: Bank Accounts
  const [bankAccountsList, setBankAccountsList] = useState<BankAccountEntry[]>([
    { name: "", type: "checking", institution: "", last4: "", currentBalance: "" },
  ]);

  async function saveStep() {
    setSaving(true);
    try {
      let stepData: { step: string; data: Record<string, unknown> };

      switch (currentStep) {
        case 0:
          stepData = {
            step: "company",
            data: { name: companyName, ein, state, entityType, formationDate },
          };
          break;
        case 1:
          stepData = {
            step: "accounting",
            data: { accountingMethod },
          };
          break;
        case 2:
          stepData = {
            step: "opening_balances",
            data: { asOfDate, retainedEarnings, commonStock, additionalCapital },
          };
          break;
        case 3:
          stepData = {
            step: "bank_accounts",
            data: { accounts: bankAccountsList.filter((a) => a.name.trim() !== "") },
          };
          break;
        default:
          return;
      }

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData),
      });

      if (!res.ok) throw new Error("Failed to save");

      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        router.push("/");
      }
    } finally {
      setSaving(false);
    }
  }

  function addBankAccount() {
    setBankAccountsList([
      ...bankAccountsList,
      { name: "", type: "checking", institution: "", last4: "", currentBalance: "" },
    ]);
  }

  function updateBankAccount(index: number, field: keyof BankAccountEntry, value: string) {
    const updated = [...bankAccountsList];
    updated[index] = { ...updated[index], [field]: value };
    setBankAccountsList(updated);
  }

  function removeBankAccount(index: number) {
    if (bankAccountsList.length <= 1) return;
    setBankAccountsList(bankAccountsList.filter((_, i) => i !== index));
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {currentStep + 1}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Set Up Your Books</h1>
          <p className="text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].description}
          </p>
        </div>
      </div>

      <Progress value={progress} className="h-2.5" />

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Business Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your PLLC name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ein">EIN (Employer Identification Number)</Label>
                <Input
                  id="ein"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
                <p className="text-xs text-muted-foreground">
                  Find this on your IRS Letter 147C or any prior tax return
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Input id="entityType" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formationDate">Formation Date</Label>
                <Input
                  id="formationDate"
                  type="date"
                  value={formationDate}
                  onChange={(e) => setFormationDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  When was your PLLC officially formed with the state?
                </p>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label>Accounting Method</Label>
                <Select value={accountingMethod} onValueChange={(v) => v && setAccountingMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Basis (Recommended)</SelectItem>
                    <SelectItem value="accrual">Accrual Basis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-accent/50 border-l-4 border-primary/50 p-4 text-sm space-y-2">
                <p className="font-medium">What does this mean?</p>
                {accountingMethod === "cash" ? (
                  <p className="text-muted-foreground">
                    <strong>Cash basis</strong> means you record income when you actually receive the money,
                    and expenses when you actually pay them. This is the simplest method and is correct for
                    most S-Corps. Your CPA almost certainly has you on cash basis.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    <strong>Accrual basis</strong> means you record income when you earn it (even before
                    receiving payment) and expenses when you incur them. This is more complex and usually
                    only needed for larger businesses. Most CRNAs should use cash basis instead.
                  </p>
                )}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="rounded-lg bg-accent/50 border-l-4 border-primary/50 p-4 text-sm space-y-2 mb-4">
                <p className="font-medium">Where to find these numbers</p>
                <p className="text-muted-foreground">
                  Open your most recent <strong>Form 1120-S</strong> tax return and find{" "}
                  <strong>Schedule L</strong> (Balance Sheet). Look in the{" "}
                  <strong>&quot;End of Tax Year&quot;</strong> column for these line items.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  id="skipBalances"
                  checked={skipBalances}
                  onChange={(e) => {
                    setSkipBalances(e.target.checked);
                    if (e.target.checked) {
                      setRetainedEarnings("");
                      setCommonStock("");
                      setAdditionalCapital("");
                    }
                  }}
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                />
                <Label htmlFor="skipBalances" className="text-sm leading-snug font-normal cursor-pointer">
                  <span className="font-medium">Schedule L is blank or this is my first year</span>
                  <span className="block text-muted-foreground mt-1">
                    This is normal. S-Corps under $250K in receipts and assets aren&apos;t required to fill out
                    Schedule L. All opening balances will be set to $0.
                  </span>
                </Label>
              </div>

              {!skipBalances && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="asOfDate">As of Date</Label>
                    <Input
                      id="asOfDate"
                      type="date"
                      value={asOfDate}
                      onChange={(e) => setAsOfDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Usually December 31 of your last tax year
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retainedEarnings">Prior Year Profits (Retained Earnings / AAA)</Label>
                    <Input
                      id="retainedEarnings"
                      type="number"
                      step="0.01"
                      value={retainedEarnings}
                      onChange={(e) => setRetainedEarnings(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Schedule L, Line 24 — &quot;Retained earnings&quot;. This is the total profit your
                      business has kept from all prior years.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commonStock">Initial Investment (Common Stock)</Label>
                    <Input
                      id="commonStock"
                      type="number"
                      step="0.01"
                      value={commonStock}
                      onChange={(e) => setCommonStock(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Schedule L, Line 22 — usually a small amount like $100 or $1,000
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalCapital">Additional Investment (Paid-In Capital)</Label>
                    <Input
                      id="additionalCapital"
                      type="number"
                      step="0.01"
                      value={additionalCapital}
                      onChange={(e) => setAdditionalCapital(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Schedule L, Line 23 — any additional money you&apos;ve invested beyond the initial stock.
                      Often $0.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="rounded-lg bg-accent/50 border-l-4 border-primary/50 p-4 text-sm space-y-2 mb-4">
                <p className="font-medium">Add your bank accounts</p>
                <p className="text-muted-foreground">
                  Add each bank account your business uses — checking, savings, and credit cards. Enter the
                  current balance so your books start in the right place.
                </p>
              </div>
              {bankAccountsList.map((acct, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Account {index + 1}</p>
                    {bankAccountsList.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeBankAccount(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Account Name</Label>
                      <Input
                        value={acct.name}
                        onChange={(e) => updateBankAccount(index, "name", e.target.value)}
                        placeholder="e.g. Chase Business Checking"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select
                        value={acct.type}
                        onValueChange={(v) => v && updateBankAccount(index, "type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Bank / Institution</Label>
                      <Input
                        value={acct.institution}
                        onChange={(e) => updateBankAccount(index, "institution", e.target.value)}
                        placeholder="e.g. Chase"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Last 4 Digits</Label>
                      <Input
                        value={acct.last4}
                        onChange={(e) => updateBankAccount(index, "last4", e.target.value)}
                        placeholder="6091"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={acct.currentBalance}
                      onChange={(e) => updateBankAccount(index, "currentBalance", e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      {acct.type === "credit_card"
                        ? "Enter the amount you owe (as a positive number)"
                        : "Enter your current account balance"}
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addBankAccount} className="w-full">
                + Add Another Account
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        <Button onClick={saveStep} disabled={saving}>
          {saving
            ? "Saving..."
            : currentStep === STEPS.length - 1
              ? "Finish Setup"
              : "Continue"}
        </Button>
      </div>
    </div>
  );
}
