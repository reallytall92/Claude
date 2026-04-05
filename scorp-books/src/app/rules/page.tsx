"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Check, X } from "lucide-react";

type Rule = {
  id: number;
  pattern: string;
  categoryId: number;
  categoryName: string | null;
  priority: number;
  createdAt: string;
};

type Category = {
  id: number;
  friendlyName: string;
  type: string;
  isActive: boolean;
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPattern, setEditPattern] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  async function loadRules() {
    const res = await fetch("/api/rules");
    const data = await res.json();
    setRules(data);
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.filter((c: Category) => c.isActive));
  }

  useEffect(() => {
    loadRules();
    loadCategories();
  }, []);

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setEditPattern(rule.pattern);
    setEditCategoryId(rule.categoryId);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPattern("");
    setEditCategoryId(null);
  }

  async function saveEdit(id: number) {
    await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pattern: editPattern, categoryId: editCategoryId }),
    });
    setEditingId(null);
    loadRules();
  }

  async function deleteRule(id: number) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadRules();
  }

  const visibleCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "income" || c.id === editCategoryId
  );

  const filtered = search
    ? rules.filter(
        (r) =>
          r.pattern.toLowerCase().includes(search.toLowerCase()) ||
          (r.categoryName && r.categoryName.toLowerCase().includes(search.toLowerCase()))
      )
    : rules;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex-1" />
                <Skeleton className="h-8 w-8" />
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
        <h1 className="text-2xl font-bold tracking-tight">Rules</h1>
        <p className="text-muted-foreground">
          {rules.length} {rules.length === 1 ? "rule" : "rules"} for auto-suggesting categories on new transactions
        </p>
      </div>

      {rules.length > 0 && (
        <Input
          placeholder="Search rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="font-medium">No rules yet</p>
            <p className="text-sm mt-1">
              When you classify a transaction, click &quot;Save as rule&quot; to automatically
              suggest that category for similar transactions in the future.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center justify-between py-3 px-4 gap-3">
                {editingId === rule.id ? (
                  <>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <Input
                        value={editPattern}
                        onChange={(e) => setEditPattern(e.target.value)}
                        className="max-w-xs font-mono text-sm"
                      />
                      <span className="text-muted-foreground text-sm shrink-0">→</span>
                      <Select
                        value={String(editCategoryId)}
                        onValueChange={(v) => setEditCategoryId(Number(v))}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {visibleCategories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.friendlyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => saveEdit(rule.id)}
                        disabled={!editPattern.trim()}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={cancelEdit}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium font-mono text-sm">&quot;{rule.pattern}&quot;</span>
                        <span className="text-muted-foreground text-sm">→</span>
                        <span className="text-sm">{rule.categoryName || "Unknown category"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {new Date(rule.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => startEdit(rule)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
