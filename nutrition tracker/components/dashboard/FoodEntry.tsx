"use client";
import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { LogEntryWithFood } from "@/lib/types";

interface FoodEntryProps {
  entry: LogEntryWithFood;
  onDelete: (id: number) => void;
  onUpdate: (id: number, servings: number) => void;
}

export function FoodEntry({ entry, onDelete, onUpdate }: FoodEntryProps) {
  const [editing, setEditing] = useState(false);
  const [servings, setServings] = useState(String(entry.servings));

  const foodName = entry.food?.name ?? "Unknown food";
  const brand = entry.food?.brand;
  const fmtNum = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);
  const servingDesc = entry.food
    ? `${fmtNum(entry.servings)} × ${fmtNum(entry.food.serving_size)}${entry.food.serving_unit}`
    : `${fmtNum(entry.servings)} serving${entry.servings !== 1 ? "s" : ""}`;

  function handleSave() {
    const val = parseFloat(servings);
    if (!isNaN(val) && val > 0) {
      onUpdate(entry.id, val);
    }
    setEditing(false);
  }

  return (
    <motion.div
      layout
      className="py-3 px-1 space-y-1.5"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Row 1: Name + Calories */}
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm leading-snug">{foodName}</span>
        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm shrink-0">{Math.round(entry.calories)} cal</span>
      </div>

      {/* Row 2: Serving info + Macros + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-400 dark:text-zinc-500 min-w-0">
          {brand && <span>{brand} · </span>}
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <input
                className="w-14 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <span>servings</span>
            </span>
          ) : (
            <span>{servingDesc}</span>
          )}
          <span className="mx-1.5">·</span>
          <span>P{Math.round(entry.protein)}g</span>
          <span className="mx-0.5">·</span>
          <span>C{Math.round(entry.carbs)}g</span>
          <span className="mx-0.5">·</span>
          <span>F{Math.round(entry.fat)}g</span>
        </div>

        <div className="flex gap-0.5 shrink-0">
          {editing ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-7 w-7" aria-label="Save servings">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setServings(String(entry.servings)); setEditing(false); }}
                className="h-7 w-7"
                aria-label="Cancel editing"
              >
                <X className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="h-7 w-7" aria-label="Edit servings">
                <Pencil className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} className="h-7 w-7" aria-label="Delete entry">
                <Trash2 className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
