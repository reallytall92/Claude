"use client";
import { useState } from "react";
import { ChevronDown, Plus, Bookmark, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FoodEntry } from "./FoodEntry";
import { MEAL_LABELS } from "@/lib/constants";
import type { Meal } from "@/lib/constants";
import type { LogEntryWithFood } from "@/lib/types";

interface MealSectionProps {
  meal: Meal;
  entries: LogEntryWithFood[];
  onAddFood: (meal: string) => void;
  onDeleteEntry: (id: number) => void;
  onUpdateEntry: (id: number, servings: number) => void;
  onSaveMeal?: (name: string, items: Array<{ food_id: number; servings: number }>) => void;
}

export function MealSection({ meal, entries, onAddFood, onDeleteEntry, onUpdateEntry, onSaveMeal }: MealSectionProps) {
  const [open, setOpen] = useState(true);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealName, setMealName] = useState("");
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
        aria-label={`${open ? "Collapse" : "Expand"} ${MEAL_LABELS[meal]}`}
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
          {Math.round(totalCal)} <span className="font-normal text-zinc-400 dark:text-zinc-500 text-xs">cal</span>
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
              {entries.length > 0 ? (
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
              ) : (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">Nothing yet</p>
              )}

              <div className="mt-2 flex items-center gap-3">
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 active:text-emerald-700 dark:active:text-emerald-300 py-2 px-1 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
                  onClick={() => onAddFood(meal)}
                >
                  <Plus className="h-4 w-4" />
                  Add food
                </button>
                {canSave && !savingMeal && (
                  <button
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-500 active:text-zinc-600 dark:active:text-zinc-300 py-2 px-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => { setSavingMeal(true); setMealName(""); }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Save as meal
                  </button>
                )}
              </div>

              <AnimatePresence>
                {savingMeal && (
                  <motion.div
                    className="mt-2 flex items-center gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <input
                      className="flex-1 min-w-0 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      placeholder="e.g., My breakfast bowl"
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && mealName.trim()) {
                          onSaveMeal!(mealName.trim(), savableItems);
                          setSavingMeal(false);
                        }
                        if (e.key === "Escape") setSavingMeal(false);
                      }}
                      autoFocus
                    />
                    <button
                      className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white disabled:opacity-40 transition-opacity"
                      disabled={!mealName.trim()}
                      aria-label="Confirm save meal"
                      onClick={() => {
                        if (mealName.trim()) {
                          onSaveMeal!(mealName.trim(), savableItems);
                          setSavingMeal(false);
                        }
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => setSavingMeal(false)}
                      aria-label="Cancel save meal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
