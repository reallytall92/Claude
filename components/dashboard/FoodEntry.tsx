"use client";
import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

interface LogEntryWithFood {
  id: number;
  food_id: number | null;
  meal: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: { name: string; brand?: string | null; serving_size: number; serving_unit: string } | null;
}

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
  const servingDesc = entry.food
    ? `${entry.servings} × ${entry.food.serving_size}${entry.food.serving_unit}`
    : `${entry.servings} serving${entry.servings !== 1 ? "s" : ""}`;

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
      className="flex items-center gap-3 py-3 px-1"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-zinc-800 text-sm truncate">{foodName}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {brand && <span className="mr-1.5">{brand} ·</span>}
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <input
                className="w-14 border border-zinc-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <span>servings</span>
            </span>
          ) : (
            servingDesc
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-semibold text-zinc-800 text-sm">{Math.round(entry.calories)} cal</div>
        <div className="text-xs text-zinc-400">
          P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F {Math.round(entry.fat)}g
        </div>
      </div>

      <div className="flex gap-0.5 shrink-0">
        {editing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setServings(String(entry.servings)); setEditing(false); }}
              className="h-8 w-8"
            >
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="h-8 w-8">
              <Pencil className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} className="h-8 w-8">
              <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
