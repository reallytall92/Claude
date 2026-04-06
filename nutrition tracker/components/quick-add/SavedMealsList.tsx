"use client";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface SavedMealItem {
  id: number;
  food_id: number;
  servings: number;
  food_name: string;
  food_brand: string | null;
  food_calories: number;
  food_serving_size: number;
  food_serving_unit: string;
}

interface SavedMeal {
  id: number;
  name: string;
  items: SavedMealItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

interface SavedMealsListProps {
  meal: string;
  date?: string;
  onAdded: (entries: object[]) => void;
}

export function SavedMealsList({ meal, date, onAdded }: SavedMealsListProps) {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/saved-meals")
      .then((r) => r.json())
      .then((data) => setMeals(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleLog(savedMealId: number) {
    setLoggingId(savedMealId);
    try {
      const res = await fetch(`/api/saved-meals/${savedMealId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal, date }),
      });
      const entries = await res.json();
      onAdded(entries);
    } finally {
      setLoggingId(null);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await fetch(`/api/saved-meals/${id}`, { method: "DELETE" });
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">
        <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-1">No saved meals yet</p>
        <p>Log two or more foods to a meal on the dashboard, then use &ldquo;Save as meal&rdquo; to reuse it later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meals.map((m) => (
        <button
          key={m.id}
          className="w-full text-left rounded-xl border border-zinc-100 dark:border-zinc-800 bg-[--color-surface] p-4 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors disabled:opacity-50"
          onClick={() => handleLog(m.id)}
          disabled={loggingId !== null}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{m.name}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                {m.items.map((item) => item.food_name).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                {Math.round(m.totals.calories)} <span className="font-normal text-zinc-400 dark:text-zinc-500 text-xs">cal</span>
              </span>
              <button
                className="p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                onClick={(e) => handleDelete(e, m.id)}
                aria-label="Delete saved meal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            <span>P {Math.round(m.totals.protein)}g</span>
            <span>C {Math.round(m.totals.carbs)}g</span>
            <span>F {Math.round(m.totals.fat)}g</span>
            <span>{m.items.length} items</span>
          </div>
        </button>
      ))}
    </div>
  );
}
