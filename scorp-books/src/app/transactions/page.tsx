"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategoryPicker } from "@/components/category-picker";
import { toast } from "sonner";
import { CircleCheck, Circle, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Transaction = {
  id: number;
  date: string;
  amount: number;
  description: string;
  rawDescription: string | null;
  accountId: number;
  categoryId: number | null;
  type: string;
  source: string;
  classificationSource: string | null;
  reconciled: boolean;
  notes: string | null;
  categoryName: string | null;
  categoryCode: string | null;
  accountName: string | null;
};

type BankAccount = {
  id: number;
  name: string;
  type: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount));
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [counts, setCounts] = useState({ all: 0, needsReview: 0, reconciled: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Manual entry form
  const [newDate, setNewDate] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newType, setNewType] = useState("debit");

  // Rule suggestions cache
  const [suggestions, setSuggestions] = useState<Record<number, number | null>>({});

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ tab });
    if (filterAccount !== "all") params.set("accountId", filterAccount);
    if (search) params.set("search", search);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setCounts(data.counts);
    setLoading(false);
  }, [tab, filterAccount, search]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  // Check for rule suggestions for unclassified transactions
  useEffect(() => {
    const unclassified = transactions.filter((t) => !t.categoryId && !suggestions[t.id]);
    if (unclassified.length === 0) return;

    Promise.all(
      unclassified.map(async (t) => {
        const res = await fetch("/api/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: t.description }),
        });
        const data = await res.json();
        return { id: t.id, categoryId: data.match ? data.categoryId : null };
      })
    ).then((results) => {
      const newSuggestions: Record<number, number | null> = {};
      for (const r of results) {
        newSuggestions[r.id] = r.categoryId;
      }
      setSuggestions((prev) => ({ ...prev, ...newSuggestions }));
    });
  }, [transactions, suggestions]);

  async function handleClassify(transactionId: number, categoryId: number | null) {
    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: transactionId, categoryId }),
    });
    loadTransactions();
  }

  async function handleSaveRule(transactionId: number, categoryId: number) {
    const txn = transactions.find((t) => t.id === transactionId);
    if (!txn) return;

    // Extract merchant pattern — use the first meaningful part of the description
    const desc = txn.description;
    // Try to get the company/merchant name
    const pattern = desc.length > 30 ? desc.substring(0, 30) : desc;

    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pattern,
        categoryId,
        transactionId,
      }),
    });

    toast("Rule saved! Similar transactions will be auto-suggested next time.");
  }

  async function handleVerify(transactionId: number) {
    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: transactionId, classificationSource: "verified" }),
    });
    loadTransactions();
  }

  const unverifiedRuleTransactions = transactions.filter(
    (t) => t.classificationSource === "rule"
  );

  async function handleApproveAll() {
    if (unverifiedRuleTransactions.length === 0) return;
    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_verify",
        ids: unverifiedRuleTransactions.map((t) => t.id),
      }),
    });
    toast(`Approved ${unverifiedRuleTransactions.length} auto-classified transaction${unverifiedRuleTransactions.length !== 1 ? "s" : ""}.`);
    loadTransactions();
  }

  async function handleAddManual() {
    if (!newDate || !newAmount || !newDescription || !newAccountId) return;

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: newDate,
        amount: newType === "credit" ? Number(newAmount) : -Number(newAmount),
        description: newDescription,
        accountId: newAccountId,
        type: newType,
        source: "manual",
      }),
    });

    setAddDialogOpen(false);
    setNewDate("");
    setNewAmount("");
    setNewDescription("");
    setNewAccountId("");
    setNewType("debit");
    loadTransactions();
    toast("Transaction added.");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <Skeleton className="h-4 w-20" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            {counts.needsReview > 0
              ? `You have ${counts.needsReview} transaction${counts.needsReview !== 1 ? "s" : ""} to review`
              : "All transactions are classified"}
          </p>
        </div>
        <div className="flex gap-2">
          {unverifiedRuleTransactions.length > 0 && (
            <Button variant="outline" onClick={handleApproveAll} className="gap-2">
              <ShieldCheck className="size-4" />
              Approve All Auto-Classifications ({unverifiedRuleTransactions.length})
            </Button>
          )}
          <Link href="/transactions/upload">
            <Button>Upload Statement</Button>
          </Link>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              Add Manually
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Money Out (Expense)</SelectItem>
                        <SelectItem value="credit">Money In (Income)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What was this transaction for?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={newAccountId} onValueChange={(v) => v && setNewAccountId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddManual} className="w-full" disabled={!newDate || !newAmount || !newDescription || !newAccountId}>
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="needs_review">
            Needs Review
            {counts.needsReview > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-xs">{counts.needsReview}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reconciled">Reconciled ({counts.reconciled})</TabsTrigger>
        </TabsList>

        <div className="flex gap-3 mt-4">
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterAccount} onValueChange={(v) => v && setFilterAccount(v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={tab} className="mt-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  {tab === "needs_review"
                    ? "All transactions are classified!"
                    : "No transactions yet. Upload a bank statement or add one manually."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {transactions.map((txn) => (
                <Card key={txn.id} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <div className="w-20 text-sm text-muted-foreground shrink-0">
                      {formatDate(txn.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{txn.accountName}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {txn.classificationSource === "rule" && (
                        <TooltipProvider delay={300}>
                          <Tooltip>
                            <TooltipTrigger
                              onClick={() => handleVerify(txn.id)}
                              className="p-0.5 rounded-md hover:bg-accent transition-colors"
                            >
                              <Circle className="size-5 text-amber-500! hover:text-green-500!" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Auto-classified by rule — click to approve
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {txn.classificationSource === "verified" && (
                        <TooltipProvider delay={300}>
                          <Tooltip>
                            <TooltipTrigger className="p-0.5 cursor-default">
                              <CircleCheck className="size-5 text-green-500!" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Approved
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <CategoryPicker
                        value={txn.categoryId}
                        categoryName={txn.categoryName}
                        suggestedCategoryId={suggestions[txn.id] ?? null}
                        onSelect={(catId) => handleClassify(txn.id, catId)}
                        onSaveRule={(catId) => handleSaveRule(txn.id, catId)}
                      />
                    </div>
                    <div className={`w-24 text-right font-mono text-sm shrink-0 ${txn.type === "credit" ? "text-green-600 dark:text-green-400" : ""}`}>
                      {txn.type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}
                    </div>
                    {txn.reconciled && (
                      <Badge variant="outline" className="shrink-0 text-xs">Reconciled</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
