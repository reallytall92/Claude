"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type BankAccount = { id: number; name: string };
type PayrollEntry = {
  id: number;
  date: string;
  memo: string | null;
  lines: { debit: number; credit: number; accountName: string | null; memo: string | null }[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function PayrollPage() {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [grossWages, setGrossWages] = useState("");
  const [employerTaxes, setEmployerTaxes] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]).then(([payroll, accts]) => {
      setEntries(payroll);
      setAccounts(accts);
      setLoading(false);
    });
  }, []);

  async function handleSubmit() {
    if (!date || !grossWages || !bankAccountId) return;
    setSaving(true);

    try {
      await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, grossWages, employerTaxes, serviceFee, bankAccountId }),
      });

      toast.success("Payroll entry recorded.");
      setDate("");
      setGrossWages("");
      setEmployerTaxes("");
      setServiceFee("");

      const updated = await fetch("/api/payroll").then((r) => r.json());
      setEntries(updated);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">
          Record each payroll run so your books reflect salary and tax expenses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record a Payroll Run</CardTitle>
          <CardDescription>
            Enter the details from your Gusto or ADP payroll summary. These numbers come from
            your payroll provider&apos;s pay run report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Paid From Account</Label>
              <Select value={bankAccountId} onValueChange={(v) => v && setBankAccountId(v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Gross Wages</Label>
              <Input type="number" step="0.01" value={grossWages} onChange={(e) => setGrossWages(e.target.value)} placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Your salary before taxes</p>
            </div>
            <div className="space-y-2">
              <Label>Employer Taxes</Label>
              <Input type="number" step="0.01" value={employerTaxes} onChange={(e) => setEmployerTaxes(e.target.value)} placeholder="0.00" />
              <p className="text-xs text-muted-foreground">SS, Medicare, FUTA/SUTA</p>
            </div>
            <div className="space-y-2">
              <Label>Service Fee</Label>
              <Input type="number" step="0.01" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Gusto/ADP monthly fee</p>
            </div>
          </div>

          {grossWages && (
            <div className="rounded-lg bg-accent/50 border-l-4 border-primary p-4 text-sm">
              <p className="font-medium mb-1">This will record:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>Your Salary expense: {formatCurrency(Number(grossWages))}</li>
                {employerTaxes && <li>Employer Payroll Taxes: {formatCurrency(Number(employerTaxes))}</li>}
                {serviceFee && Number(serviceFee) > 0 && <li>Payroll Service Fee: {formatCurrency(Number(serviceFee))}</li>}
                <li className="font-medium text-foreground pt-1">
                  Total from bank: {formatCurrency(Number(grossWages) + Number(employerTaxes || 0) + Number(serviceFee || 0))}
                </li>
              </ul>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={saving || !date || !grossWages || !bankAccountId}>
            {saving ? "Recording..." : "Record Payroll"}
          </Button>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.map((entry) => {
                const total = entry.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{entry.memo}</p>
                      <p className="text-sm text-muted-foreground">{entry.date}</p>
                    </div>
                    <p className="font-mono">{formatCurrency(total / 2)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
