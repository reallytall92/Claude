"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: number;
  code: string;
  name: string;
  friendlyName: string;
  description: string | null;
  type: string;
  group: string | null;
  isDefault: boolean;
  isActive: boolean;
};

const typeColors: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  liability: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  equity: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  income: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  expense: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const typeLabels: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

const GROUPS = [
  "Bank Accounts",
  "Property & Equipment",
  "Money You Owe",
  "Owner's Equity",
  "Income",
  "Salary & Payroll",
  "Insurance & Licenses",
  "Education & Dues",
  "Office & Tech",
  "Other Expenses",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // New category form
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newFriendlyName, setNewFriendlyName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("expense");
  const [newGroup, setNewGroup] = useState("Other Expenses");

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function toggleActive(id: number) {
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle_active" }),
    });
    loadCategories();
  }

  async function handleAdd() {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        name: newName,
        friendlyName: newFriendlyName || newName,
        description: newDescription,
        type: newType,
        group: newGroup,
      }),
    });
    setDialogOpen(false);
    setNewCode("");
    setNewName("");
    setNewFriendlyName("");
    setNewDescription("");
    setNewType("expense");
    setNewGroup("Other Expenses");
    loadCategories();
  }

  const filtered = categories.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.friendlyName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Group by category group
  const grouped = filtered.reduce<Record<string, Category[]>>((acc, cat) => {
    const g = cat.group || "Ungrouped";
    if (!acc[g]) acc[g] = [];
    acc[g].push(cat);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16" />
                <div className="flex-1" />
                <Skeleton className="h-8 w-24" />
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
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            {categories.filter((c) => c.isActive).length} active categories for classifying transactions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            Add Category
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. 5200" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accounting Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Vehicle Expenses" />
              </div>
              <div className="space-y-2">
                <Label>Display Name (what you see in the app)</Label>
                <Input value={newFriendlyName} onChange={(e) => setNewFriendlyName(e.target.value)} placeholder="e.g. Car & Vehicle Costs" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="A short description of when to use this category"
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={newGroup} onValueChange={(v) => v && setNewGroup(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!newCode || !newName}>
                Add Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="asset">Assets</SelectItem>
            <SelectItem value="liability">Liabilities</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {Object.entries(grouped).map(([group, cats]) => (
        <div key={group} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b">
            {group}
          </h2>
          <div className="space-y-1">
            {cats.map((cat) => (
              <Card key={cat.id} className={`${!cat.isActive ? "opacity-50" : ""}`}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cat.friendlyName}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[cat.type]}`}>
                        {typeLabels[cat.type]}
                      </span>
                      {!cat.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(cat.id)}
                  >
                    {cat.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
