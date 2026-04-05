"use client";
import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { FoodEntry } from "./FoodEntry";

type LogEntryWithFood = Parameters<typeof FoodEntry>[0]["entry"];

interface MealSectionProps {
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  entries: LogEntryWithFood[];
  onAddFood: (meal: string) => void;
  onDeleteEntry: (id: number) => void;
  onUpdateEntry: (id: number, servings: number) => void;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function MealSection({ meal, entries, onAddFood, onDeleteEntry, onUpdateEntry }: MealSectionProps) {
  const [open, setOpen] = useState(true);
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50/80 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </motion.div>
          <span className="font-bold text-zinc-800">{MEAL_LABELS[meal]}</span>
          {entries.length > 0 && (
            <span className="text-xs text-zinc-400 font-medium bg-zinc-100 px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-zinc-600">
          {Math.round(totalCal)} <span className="font-normal text-zinc-400 text-xs">kcal</span>
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
                <div className="divide-y divide-zinc-50">
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

              <button
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 active:text-emerald-700 py-2 px-1 rounded-lg hover:bg-emerald-50/60 transition-colors"
                onClick={() => onAddFood(meal)}
              >
                <Plus className="h-4 w-4" />
                Add food
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
