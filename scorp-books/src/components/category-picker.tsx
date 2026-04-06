"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  DollarSign,
  Landmark,
  Briefcase,
  Shield,
  GraduationCap,
  Monitor,
  Receipt,
  Building2,
  PiggyBank,
  CircleDot,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = {
  id: number;
  code: string;
  friendlyName: string;
  description: string | null;
  type: string;
  group: string | null;
  isActive: boolean;
};

// Module-level cache: fetched once, shared across all CategoryPicker instances
let _cachedCategories: Category[] | null = null;
let _fetchPromise: Promise<Category[]> | null = null;

function getCategories(): Promise<Category[]> {
  if (_cachedCategories) return Promise.resolve(_cachedCategories);
  if (!_fetchPromise) {
    _fetchPromise = fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        _cachedCategories = data.filter((c) => c.isActive);
        return _cachedCategories;
      });
  }
  return _fetchPromise;
}

type CategoryPickerProps = {
  value: number | null;
  categoryName?: string | null;
  suggestedCategoryId?: number | null;
  onSelect: (categoryId: number | null) => void;
  onSaveRule?: (categoryId: number) => void;
  fullWidth?: boolean;
};

const groupIcons: Record<string, { icon: LucideIcon; color: string }> = {
  "Income": { icon: DollarSign, color: "text-green-500" },
  "Salary & Payroll": { icon: Briefcase, color: "text-blue-500" },
  "Insurance & Licenses": { icon: Shield, color: "text-amber-500" },
  "Education & Dues": { icon: GraduationCap, color: "text-violet-500" },
  "Office & Tech": { icon: Monitor, color: "text-cyan-500" },
  "Other Expenses": { icon: Receipt, color: "text-orange-500" },
  "Bank Accounts": { icon: Landmark, color: "text-emerald-500" },
  "Property & Equipment": { icon: Building2, color: "text-rose-500" },
  "Money You Owe": { icon: Receipt, color: "text-red-500" },
  "Owner's Equity": { icon: PiggyBank, color: "text-teal-500" },
};

export function CategoryPicker({
  value,
  categoryName,
  suggestedCategoryId,
  onSelect,
  onSaveRule,
  fullWidth,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ruleSaved, setRuleSaved] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      getCategories().then((data) => {
        setCategories(data);
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  // Frequently used categories shown at top (by account code)
  const frequentCodes = useMemo(() => new Set(["4010", "5010", "5020", "3040", "5030", "5080", "5110"]), []);

  const { frequentCats, grouped } = useMemo(() => {
    const freq = categories.filter((c) => frequentCodes.has(c.code));
    const rest = categories.filter((c) => !frequentCodes.has(c.code));
    const g = rest.reduce<Record<string, Category[]>>((acc, cat) => {
      const group = cat.group || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    }, {});
    return { frequentCats: freq, grouped: g };
  }, [categories, frequentCodes]);

  const suggestedCategory = suggestedCategoryId
    ? categories.find((c) => c.id === suggestedCategoryId)
    : null;

  const handleSelect = useCallback((catId: number | null) => {
    onSelect(catId);
    setOpen(false);
  }, [onSelect]);

  return (
    <div className={fullWidth ? "space-y-2" : "flex items-center gap-2"}>
      {suggestedCategory && !value && (
        <Button
          variant="outline"
          size={fullWidth ? "default" : "sm"}
          className={fullWidth ? "w-full border-dashed text-sm justify-start" : "text-xs border-dashed"}
          onClick={() => onSelect(suggestedCategory.id)}
        >
          Suggested: {suggestedCategory.friendlyName}
        </Button>
      )}

      <Button
        variant={fullWidth ? "default" : "outline"}
        size={fullWidth ? "lg" : "sm"}
        onClick={() => setOpen(true)}
        onMouseEnter={() => getCategories()}
        className={fullWidth ? "w-full text-base justify-center gap-2" : ""}
      >
        {value && categoryName ? (
          fullWidth ? (
            <span>{categoryName}</span>
          ) : (
            <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
          )
        ) : (
          <span className={fullWidth ? "text-primary-foreground/80" : "text-muted-foreground"}>Pick a category...</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[60vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl shadow-xl ring-1 ring-border" showCloseButton={false}>
          <Command className="border-none" loop>
            <div className="px-4 pt-4 pb-1">
              <DialogHeader className="pb-3">
                <DialogTitle className="text-base font-semibold tracking-tight">Pick a category</DialogTitle>
              </DialogHeader>
              <CommandInput placeholder="Search categories..." />
            </div>
            <CommandSeparator />
            <CommandList className="flex-1 overflow-y-auto px-2 py-2 max-h-[40vh] [transform:translateZ(0)]">
              <CommandEmpty className="py-12 text-center">
                <span className="text-sm text-muted-foreground">No matching category found.</span>
              </CommandEmpty>
              {value && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleSelect(null)}
                    className="rounded-lg"
                  >
                    <XCircle className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Clear selection</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {frequentCats.length > 0 && (
                <CommandGroup heading={<span className="flex items-center gap-1.5"><Star className="size-3 text-muted-foreground" />Frequently Used</span>}>
                  {frequentCats.map((cat) => (
                    <CategoryItem
                      key={cat.id}
                      cat={cat}
                      isSelected={value === cat.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              )}
              {Object.entries(grouped).map(([group, cats]) => {
                const g = groupIcons[group];
                const Icon = g?.icon || CircleDot;
                const iconColor = g?.color || "text-muted-foreground";
                return (
                  <CommandGroup key={group} heading={<span className="flex items-center gap-1.5"><Icon className={`size-3 ${iconColor}`} />{group}</span>}>
                    {cats.map((cat) => (
                      <CategoryItem
                        key={cat.id}
                        cat={cat}
                        isSelected={value === cat.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {value && onSaveRule && (
        ruleSaved ? (
          <span className={fullWidth ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground"}>Rule saved</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={fullWidth ? "text-sm" : "text-xs"}
            onClick={() => {
              onSaveRule(value);
              setRuleSaved(true);
            }}
          >
            Save as rule
          </Button>
        )
      )}
    </div>
  );
}

const CategoryItem = memo(function CategoryItem({
  cat,
  isSelected,
  onSelect,
}: {
  cat: Category;
  isSelected: boolean;
  onSelect: (catId: number | null) => void;
}) {
  return (
    <CommandItem
      value={`${cat.friendlyName} ${cat.description || ""}`}
      onSelect={() => onSelect(cat.id)}
      className="rounded-lg px-3 py-2.5"
      data-checked={isSelected || undefined}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm leading-tight">{cat.friendlyName}</span>
        {cat.description && (
          <span className="text-xs text-muted-foreground leading-snug">{cat.description}</span>
        )}
      </div>
    </CommandItem>
  );
});
