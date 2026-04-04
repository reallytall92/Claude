"use client";
import { useState, useEffect, useCallback } from "react";
import { DayHeader } from "@/components/dashboard/DayHeader";
import { MacroSummary } from "@/components/dashboard/MacroSummary";
import { MealSection } from "@/components/dashboard/MealSection";
import { QuickAddDrawer } from "@/components/quick-add/QuickAddDrawer";
import { todayStr } from "@/lib/utils";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = typeof MEALS[number];

interface LogEntry {
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

function stepDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMeal, setDrawerMeal] = useState<string | null>(null);

  const fetchEntries = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/log?date=${d}`);
      const data = await res.json();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(date); }, [date, fetchEntries]);

  const totalMacros = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  async function handleDelete(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/log/${id}`, { method: "DELETE" });
  }

  async function handleUpdate(id: number, servings: number) {
    const res = await fetch(`/api/log/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings }),
    });
    const updated = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }

  function handleAdded(entry: object) {
    setEntries((prev) => [...prev, entry as LogEntry]);
  }

  return (
    <div className="space-y-4">
      <DayHeader
        date={date}
        onPrev={() => setDate((d) => stepDate(d, -1))}
        onNext={() => setDate((d) => stepDate(d, 1))}
      />

      <MacroSummary macros={totalMacros} />

      {loading ? (
        <div className="text-center py-12 text-zinc-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          {MEALS.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={entries.filter((e) => e.meal === meal)}
              onAddFood={(m) => setDrawerMeal(m)}
              onDeleteEntry={handleDelete}
              onUpdateEntry={handleUpdate}
            />
          ))}
        </div>
      )}

      {drawerMeal && (
        <QuickAddDrawer
          open={!!drawerMeal}
          meal={drawerMeal}
          onClose={() => setDrawerMeal(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
