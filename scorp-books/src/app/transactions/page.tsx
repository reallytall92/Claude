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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategoryPicker } from "@/components/category-picker";
import { toast } from "sonner";
import { CircleCheck, Circle, ShieldCheck, ChevronLeft, ChevronRight, LayoutList, CreditCard, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  const [counts, setCounts] = useState({ all: 0, needsReview: 0, needsVerification: 0, reconciled: 0 });
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

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [cardIndex, setCardIndex] = useState(0);
  const [showRaw, setShowRaw] = useState(false);

  // Rule suggestions cache
  const [suggestions, setSuggestions] = useState<Record<number, number | null>>({});

  // Rule confirmation dialog
  const [ruleConfirm, setRuleConfirm] = useState<{
    ruleId: number;
    pendingCount: number;
    categoryName: string;
  } | null>(null);

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

  // Reset card index when filters/data change
  useEffect(() => {
    setCardIndex(0);
    setShowRaw(false);
  }, [tab, filterAccount, search]);

  // Clamp card index when transactions shrink
  useEffect(() => {
    if (cardIndex >= transactions.length && transactions.length > 0) {
      setCardIndex(transactions.length - 1);
    }
  }, [transactions.length, cardIndex]);

  // Keyboard navigation for card view
  useEffect(() => {
    if (viewMode !== "card") return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setViewMode("list");
      } else if (e.key === "ArrowLeft") {
        setCardIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setCardIndex((i) => Math.min(transactions.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewMode, transactions.length]);

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

    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pattern,
        categoryId,
        transactionId,
      }),
    });
    const result = await res.json();

    if (result.pendingCount > 0) {
      const catName = txn.categoryName || "this category";
      setRuleConfirm({
        ruleId: result.id,
        pendingCount: result.pendingCount,
        categoryName: catName,
      });
    } else {
      toast("Rule saved! Similar transactions will be auto-classified next time.");
    }
  }

  async function handleApplyRule() {
    if (!ruleConfirm) return;
    const res = await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ruleConfirm.ruleId, action: "apply" }),
    });
    const result = await res.json();
    setRuleConfirm(null);
    toast(`Auto-classified ${result.applied} transaction${result.applied !== 1 ? "s" : ""}.`);
    loadTransactions();
  }

  function handleSkipApplyRule() {
    setRuleConfirm(null);
    toast("Rule saved! Similar transactions will be auto-classified next time.");
  }

  async function handleVerify(transactionId: number) {
    // Optimistic: show green immediately
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, classificationSource: "verified" } : t
      )
    );

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
    const count = unverifiedRuleTransactions.length;
    const ids = new Set(unverifiedRuleTransactions.map((t) => t.id));

    // Optimistic: flip all to green immediately
    setTransactions((prev) =>
      prev.map((t) =>
        ids.has(t.id) ? { ...t, classificationSource: "verified" } : t
      )
    );
    toast(`Approved ${count} auto-classified transaction${count !== 1 ? "s" : ""}.`);

    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_verify",
        ids: [...ids],
      }),
    });
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
          <TabsTrigger value="needs_verification">
            Needs Verification
            {counts.needsVerification > 0 && (
              <Badge variant="outline" className="ml-1.5 text-xs border-amber-500 text-amber-500">{counts.needsVerification}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reconciled">Reconciled ({counts.reconciled})</TabsTrigger>
        </TabsList>

        <div className="flex gap-3 mt-4 items-center">
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
          <div className="ml-auto flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="List view"
            >
              <LayoutList className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "card" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Card view"
            >
              <CreditCard className="size-4" />
            </button>
          </div>
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
          ) : viewMode === "card" ? (
            (() => {
              const txn = transactions[cardIndex];
              if (!txn) return null;
              const workflowState = !txn.categoryId
                ? "needs-review"
                : txn.classificationSource === "rule"
                  ? "needs-verification"
                  : "verified";
              return (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm" onClick={() => setViewMode("list")}>
                <div className="flex items-center gap-6 w-full max-w-[44rem]" onClick={(e) => e.stopPropagation()}>
                  {/* Left arrow */}
                  <Button
                    variant="outline"
                    size="icon-lg"
                    onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setShowRaw(false); }}
                    disabled={cardIndex === 0}
                    aria-label="Previous transaction"
                    className="shrink-0 text-foreground"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>

                  {/* Card */}
                  <Card className={cn(
                    "flex-1 shadow-lg transition-all overflow-hidden",
                    workflowState === "needs-review" && "ring-2 ring-destructive/30 border-destructive/20",
                    workflowState === "needs-verification" && "ring-2 ring-amber-500/30 border-amber-500/20",
                    workflowState === "verified" && "ring-1 ring-border/60",
                  )}>
                    <CardContent className="p-0">
                      {/* Status bar + counter */}
                      <div className="flex items-center justify-between px-6 pt-4 pb-0">
                        <Badge
                          variant={workflowState === "needs-review" ? "destructive" : workflowState === "needs-verification" ? "outline" : "secondary"}
                          className={cn(
                            "text-xs",
                            workflowState === "needs-verification" && "border-amber-500 text-amber-600 dark:text-amber-400",
                            workflowState === "verified" && "text-green-600 dark:text-green-400",
                          )}
                        >
                          {workflowState === "needs-review" && "Needs Review"}
                          {workflowState === "needs-verification" && "Auto-classified"}
                          {workflowState === "verified" && "Verified"}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {cardIndex + 1} of {transactions.length}
                        </span>
                      </div>

                      {/* Hero: title + amount */}
                      <div className="px-6 pt-5 pb-4 text-center space-y-1">
                        <h2 className="text-xl font-semibold tracking-tight">{txn.description}</h2>
                        <p className={cn(
                          "text-4xl font-bold tracking-tight tabular-nums",
                          txn.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-foreground"
                        )}>
                          {txn.type === "credit" ? "+" : "\u2212"}{formatCurrency(txn.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground pt-1">
                          {txn.type === "credit" ? "Money In" : "Money Out"}
                          <span className="mx-1.5 text-border">&middot;</span>
                          {formatDate(txn.date)}
                          <span className="mx-1.5 text-border">&middot;</span>
                          {txn.accountName}
                        </p>
                      </div>

                      {/* Raw bank text toggle + reconciled */}
                      <div className="px-6 pb-4 space-y-2">
                        {txn.rawDescription && txn.rawDescription !== txn.description && (
                          <>
                            <button
                              onClick={() => setShowRaw(!showRaw)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showRaw ? <EyeOff className="size-3.5 text-muted-foreground" /> : <Eye className="size-3.5 text-muted-foreground" />}
                              {showRaw ? "Hide" : "Show"} bank text
                            </button>
                            {showRaw && (
                              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground font-mono leading-relaxed break-all">
                                {txn.rawDescription}
                              </div>
                            )}
                          </>
                        )}

                        {txn.reconciled && (
                          <Badge variant="outline" className="text-xs">Reconciled</Badge>
                        )}
                      </div>

                      {/* Classification — the primary action */}
                      <div className="border-t bg-muted/30 px-6 py-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            {workflowState === "needs-review" && "Classify this transaction"}
                            {workflowState === "needs-verification" && "Review classification"}
                            {workflowState === "verified" && "Classification"}
                          </p>
                          {txn.classificationSource === "rule" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerify(txn.id)}
                              className="gap-1.5 border-green-600 text-green-600 hover:bg-green-500/10 dark:border-green-400 dark:text-green-400"
                            >
                              <CircleCheck className="size-4" />
                              Approve
                            </Button>
                          )}
                          {txn.classificationSource === "verified" && (
                            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                              <CircleCheck className="size-4" />
                              Approved
                            </span>
                          )}
                        </div>
                        <CategoryPicker
                          value={txn.categoryId}
                          categoryName={txn.categoryName}
                          suggestedCategoryId={suggestions[txn.id] ?? null}
                          onSelect={(catId) => handleClassify(txn.id, catId)}
                          onSaveRule={(catId) => handleSaveRule(txn.id, catId)}
                          fullWidth
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right arrow */}
                  <Button
                    variant="outline"
                    size="icon-lg"
                    onClick={() => { setCardIndex((i) => Math.min(transactions.length - 1, i + 1)); setShowRaw(false); }}
                    disabled={cardIndex === transactions.length - 1}
                    aria-label="Next transaction"
                    className="shrink-0 text-foreground"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-px">
              {transactions.map((txn, idx) => (
                <Card key={txn.id} className="hover:bg-accent/50 transition-colors cursor-pointer rounded-none first:rounded-t-lg last:rounded-b-lg border-x border-t-0 first:border-t border-b last:border-b" onClick={() => { setCardIndex(idx); setViewMode("card"); setShowRaw(false); }}>
                  <CardContent className="flex items-center gap-3 py-2 px-4">
                    <div className="w-20 text-sm text-muted-foreground shrink-0">
                      {formatDate(txn.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{txn.description} <span className="font-normal text-muted-foreground">· {txn.accountName}</span></p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                    <div className={`w-28 text-right font-mono text-sm shrink-0 ${txn.type === "credit" ? "text-green-600 dark:text-green-400" : ""}`}>
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

      {/* Rule auto-classify confirmation */}
      <Dialog open={!!ruleConfirm} onOpenChange={(open) => { if (!open) handleSkipApplyRule(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply rule to existing transactions?</DialogTitle>
            <DialogDescription>
              {ruleConfirm?.pendingCount} uncategorized transaction{ruleConfirm?.pendingCount !== 1 ? "s" : ""} match{ruleConfirm?.pendingCount === 1 ? "es" : ""} this
              rule and would be classified as <span className="font-medium text-foreground">{ruleConfirm?.categoryName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={handleSkipApplyRule}>
              No, just save the rule
            </Button>
            <Button onClick={handleApplyRule}>
              Yes, classify {ruleConfirm?.pendingCount} transaction{ruleConfirm?.pendingCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
