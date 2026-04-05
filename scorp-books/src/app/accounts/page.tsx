"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, PiggyBank, CreditCard } from "lucide-react";

type BankAccount = {
  id: number;
  name: string;
  type: "checking" | "savings" | "credit_card";
  institution: string | null;
  last4: string | null;
  currentBalance: number;
};

const typeLabels: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("checking");
  const [institution, setInstitution] = useState("");
  const [last4, setLast4] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function resetForm() {
    setName("");
    setType("checking");
    setInstitution("");
    setLast4("");
    setCurrentBalance("");
    setEditingAccount(null);
  }

  function openEdit(account: BankAccount) {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setInstitution(account.institution || "");
    setLast4(account.last4 || "");
    setCurrentBalance(String(account.currentBalance));
    setDialogOpen(true);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { name, type, institution, last4, currentBalance };

    if (editingAccount) {
      await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingAccount.id }),
      });
    } else {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setDialogOpen(false);
    resetForm();
    loadAccounts();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28" />
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
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button />} onClick={openNew}>
            Add Account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chase Business Checking" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bank / Institution</Label>
                  <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Chase" />
                </div>
                <div className="space-y-2">
                  <Label>Last 4 Digits</Label>
                  <Input value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="6091" maxLength={4} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingAccount ? "Save Changes" : "Add Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No accounts yet. Add your checking, savings, and credit card accounts to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
              onClick={() => openEdit(account)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = typeIcons[account.type] || Landmark; return <Icon className="size-4 text-muted-foreground" />; })()}
                    <CardTitle className="text-base">{account.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{typeLabels[account.type]}</Badge>
                </div>
                {account.institution && (
                  <p className="text-sm text-muted-foreground">
                    {account.institution}
                    {account.last4 && ` (...${account.last4})`}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${account.type === "credit_card" ? "text-destructive" : ""}`}>
                  {account.type === "credit_card" && account.currentBalance > 0 && "-"}
                  {formatCurrency(account.currentBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {account.type === "credit_card" ? "Amount owed" : "Available balance"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
