"use client";

import { useState, useEffect } from "react";
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

type CategoryPickerProps = {
  value: number | null;
  categoryName?: string | null;
  suggestedCategoryId?: number | null;
  onSelect: (categoryId: number | null) => void;
  onSaveRule?: (categoryId: number) => void;
};

const groupIcons: Record<string, LucideIcon> = {
  "Income": DollarSign,
  "Salary & Payroll": Briefcase,
  "Insurance & Licenses": Shield,
  "Education & Dues": GraduationCap,
  "Office & Tech": Monitor,
  "Other Expenses": Receipt,
  "Bank Accounts": Landmark,
  "Property & Equipment": Building2,
  "Money You Owe": Receipt,
  "Owner's Equity": PiggyBank,
};

export function CategoryPicker({
  value,
  categoryName,
  suggestedCategoryId,
  onSelect,
  onSaveRule,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ruleSaved, setRuleSaved] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((data) => {
          setCategories(data.filter((c: Category) => c.isActive));
          setLoaded(true);
        });
    }
  }, [open, loaded]);

  // Frequently used categories shown at top (by account code)
  const frequentCodes = new Set(["4010", "5010", "5020", "3040", "5030", "5080", "5110"]);

  const visible = categories;

  const frequentCats = visible.filter((c) => frequentCodes.has(c.code));
  const restCats = visible.filter((c) => !frequentCodes.has(c.code));

  // Group the remaining categories for display
  const grouped = restCats.reduce<Record<string, Category[]>>((acc, cat) => {
    const g = cat.group || "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(cat);
    return acc;
  }, {});

  const suggestedCategory = suggestedCategoryId
    ? categories.find((c) => c.id === suggestedCategoryId)
    : null;

  return (
    <div className="flex items-center gap-2">
      {suggestedCategory && !value && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-dashed"
          onClick={() => onSelect(suggestedCategory.id)}
        >
          Suggested: {suggestedCategory.friendlyName}
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {value && categoryName ? (
          <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
        ) : (
          <span className="text-muted-foreground">Pick a category...</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" showCloseButton={false}>
          <Command className="border-none" loop>
            <div className="px-4 pt-4 pb-1">
              <DialogHeader className="pb-3">
                <DialogTitle className="text-base font-semibold tracking-tight">Pick a category</DialogTitle>
              </DialogHeader>
              <CommandInput placeholder="Search categories..." />
            </div>
            <CommandSeparator />
            <CommandList className="flex-1 overflow-y-auto px-2 py-2 max-h-[60vh]">
              <CommandEmpty className="py-12 text-center">
                <span className="text-sm text-muted-foreground">No matching category found.</span>
              </CommandEmpty>
              {value && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                    className="rounded-lg"
                  >
                    <XCircle className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Clear selection</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {frequentCats.length > 0 && (
                <CommandGroup heading={<span className="flex items-center gap-1.5"><Star className="size-3" />Frequently Used</span>}>
                  {frequentCats.map((cat) => (
                    <CategoryItem
                      key={cat.id}
                      cat={cat}
                      isSelected={value === cat.id}
                      onSelect={() => {
                        onSelect(cat.id);
                        setOpen(false);
                      }}
                    />
                  ))}
                </CommandGroup>
              )}
              {Object.entries(grouped).map(([group, cats]) => {
                const Icon = groupIcons[group] || CircleDot;
                return (
                  <CommandGroup key={group} heading={<span className="flex items-center gap-1.5"><Icon className="size-3" />{group}</span>}>
                    {cats.map((cat) => (
                      <CategoryItem
                        key={cat.id}
                        cat={cat}
                        isSelected={value === cat.id}
                        onSelect={() => {
                          onSelect(cat.id);
                          setOpen(false);
                        }}
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
          <span className="text-xs text-muted-foreground">Rule saved</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
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

function CategoryItem({
  cat,
  isSelected,
  onSelect,
}: {
  cat: Category;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${cat.friendlyName} ${cat.description || ""}`}
      onSelect={onSelect}
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
}
