"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
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
        className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
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

      {open && (
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
            className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 active:text-emerald-700 py-2 px-1"
            onClick={() => onAddFood(meal)}
          >
            <Plus className="h-4 w-4" />
            Add food
          </button>
        </div>
      )}
    </div>
  );
}
