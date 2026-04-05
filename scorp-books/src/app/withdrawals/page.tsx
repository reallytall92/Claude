"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet as WalletIcon, Hash } from "lucide-react";
import { toast } from "sonner";

type BankAccount = { id: number; name: string };
type Withdrawal = {
  id: number;
  date: string;
  memo: string | null;
  amount: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [ytdTotal, setYtdTotal] = useState(0);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const [wData, accts] = await Promise.all([
      fetch("/api/withdrawals").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]);
    setWithdrawals(wData.withdrawals);
    setYtdTotal(wData.ytdTotal);
    setAccounts(accts);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit() {
    if (!date || !amount || !bankAccountId) return;
    setSaving(true);

    try {
      await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, amount, memo, bankAccountId }),
      });

      toast.success("Withdrawal recorded.");
      setDate("");
      setAmount("");
      setMemo("");
      loadData();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-52 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-9 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Owner Withdrawals</h1>
        <p className="text-muted-foreground">
          Track money you&apos;ve taken out of the business beyond your W-2 salary
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">YTD Withdrawals</p>
              <WalletIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(ytdTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This reduces your equity (AAA) in the company
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <Hash className="size-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{withdrawals.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record a Withdrawal</CardTitle>
          <CardDescription>
            Any time you transfer money from the business to yourself (beyond payroll), record it here.
            This is NOT a business expense — it&apos;s a reduction of your ownership equity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>From Account</Label>
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
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. Monthly owner draw" />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !date || !amount || !bankAccountId}>
            {saving ? "Recording..." : "Record Withdrawal"}
          </Button>
        </CardContent>
      </Card>

      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{w.memo || "Owner withdrawal"}</p>
                    <p className="text-sm text-muted-foreground">{w.date}</p>
                  </div>
                  <p className="font-mono text-lg">{formatCurrency(w.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium mb-2">What counts as an owner withdrawal?</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Transfers from your business account to your personal account</li>
            <li>Personal bills paid from the business account (car payment, mortgage, etc.)</li>
            <li>Cash withdrawals for personal use</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Your W-2 salary from Gusto/ADP is <strong>not</strong> a withdrawal — it goes through payroll.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
