"use client";
import { useState } from "react";
import { ChevronDown, Plus, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FoodEntry } from "./FoodEntry";

type LogEntryWithFood = Parameters<typeof FoodEntry>[0]["entry"];

interface MealSectionProps {
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  entries: LogEntryWithFood[];
  onAddFood: (meal: string) => void;
  onDeleteEntry: (id: number) => void;
  onUpdateEntry: (id: number, servings: number) => void;
  onSaveMeal?: (name: string, items: Array<{ food_id: number; servings: number }>) => void;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function MealSection({ meal, entries, onAddFood, onDeleteEntry, onUpdateEntry, onSaveMeal }: MealSectionProps) {
  const [open, setOpen] = useState(true);
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);

  // Only entries with a food_id can be part of a saved meal
  const savableItems = entries
    .filter((e) => e.food_id != null)
    .map((e) => ({ food_id: e.food_id!, servings: e.servings }));
  const canSave = onSaveMeal && savableItems.length >= 2;

  return (
    <div className="bg-[--color-surface] rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50/80 dark:active:bg-zinc-800/80 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </motion.div>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">{MEAL_LABELS[meal]}</span>
          {entries.length > 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
          {Math.round(totalCal)} <span className="font-normal text-zinc-400 dark:text-zinc-500 text-xs">kcal</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {entries.length > 0 && (
                <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {entries.map((entry) => (
                    <FoodEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={onDeleteEntry}
                      onUpdate={onUpdateEntry}
                    />
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3">
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 active:text-emerald-700 dark:active:text-emerald-300 py-2 px-1 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
                  onClick={() => onAddFood(meal)}
                >
                  <Plus className="h-4 w-4" />
                  Add food
                </button>
                {canSave && (
                  <button
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-500 active:text-zinc-600 dark:active:text-zinc-300 py-2 px-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => {
                      const name = window.prompt("Name this meal:");
                      if (name?.trim()) onSaveMeal(name.trim(), savableItems);
                    }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Save as meal
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
