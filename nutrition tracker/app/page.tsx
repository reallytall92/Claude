"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DayHeader } from "@/components/dashboard/DayHeader";
import { MacroSummary } from "@/components/dashboard/MacroSummary";
import { MealSection } from "@/components/dashboard/MealSection";
import { QuickAddDrawer } from "@/components/quick-add/QuickAddDrawer";
import { todayStr, formatDate } from "@/lib/utils";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = (typeof MEALS)[number];

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
  return formatDate(d);
}

/* ─── Skeleton placeholders ─── */
function MacroSummarySkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100/80 p-5">
      <div className="flex items-center gap-5">
        <div className="skeleton shrink-0" style={{ width: 128, height: 128, borderRadius: "50%" }} />
        <div className="flex-1 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton" style={{ width: 52, height: 52, borderRadius: "50%" }} />
              <div className="flex-1">
                <div className="skeleton h-2.5 w-16 mb-1.5" />
                <div className="skeleton h-3.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealSectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-4 w-14" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMeal, setDrawerMeal] = useState<string | null>(null);
  const [goals, setGoals] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setGoals({
        calories: Number(s.calorie_goal),
        protein: Number(s.protein_goal),
        carbs: Number(s.carbs_goal),
        fat: Number(s.fat_goal),
      }));
  }, []);

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

  useEffect(() => {
    fetchEntries(date);
  }, [date, fetchEntries]);

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

  async function handleSaveMeal(name: string, items: Array<{ food_id: number; servings: number }>) {
    await fetch("/api/saved-meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
  }

  return (
    <div className="space-y-4">
      <DayHeader
        date={date}
        onPrev={() => setDate((d) => stepDate(d, -1))}
        onNext={() => setDate((d) => stepDate(d, 1))}
      />

      {loading ? (
        <>
          <MacroSummarySkeleton />
          <div className="space-y-3">
            {MEALS.map((_, i) => (
              <MealSectionSkeleton key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          <MacroSummary macros={totalMacros} goals={goals ?? undefined} />

          <div className="space-y-3">
            {MEALS.map((meal, i) => (
              <motion.div
                key={meal}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.08 + i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <MealSection
                  meal={meal}
                  entries={entries.filter((e) => e.meal === meal)}
                  onAddFood={(m) => setDrawerMeal(m)}
                  onDeleteEntry={handleDelete}
                  onUpdateEntry={handleUpdate}
                  onSaveMeal={handleSaveMeal}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}

      {drawerMeal && (
        <QuickAddDrawer
          open={!!drawerMeal}
          meal={drawerMeal}
          date={date}
          onClose={() => setDrawerMeal(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
