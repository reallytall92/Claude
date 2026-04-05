"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

interface DaySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
}

interface LogEntry {
  date: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: { name: string; brand?: string | null; serving_size: number; serving_unit: string } | null;
  servings: number;
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/* ─── Weekly sparkline bar chart ─── */
function WeeklySparkline({ summaries }: { summaries: Map<string, DaySummary> }) {
  const today = new Date();
  const days: { label: string; date: string; calories: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const s = summaries.get(dateStr);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      date: dateStr,
      calories: s?.calories ?? 0,
    });
  }

  const maxCal = Math.max(...days.map((d) => d.calories), 1);

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Last 7 days
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map((day, i) => {
          const pct = day.calories / maxCal;
          const isToday = i === 6;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-md"
                style={{
                  backgroundColor: isToday ? "#10b981" : day.calories > 0 ? "#a7f3d0" : "#f1f5f9",
                  minHeight: 4,
                }}
                initial={{ height: 4 }}
                animate={{ height: `${Math.max(pct * 48, 4)}px` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className={`text-[9px] font-medium ${isToday ? "text-emerald-600" : "text-zinc-400"}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
        <span>
          Avg{" "}
          <span className="font-semibold text-zinc-600">
            {Math.round(days.reduce((s, d) => s + d.calories, 0) / Math.max(days.filter((d) => d.calories > 0).length, 1))}
          </span>{" "}
          kcal
        </span>
        <span>
          Today{" "}
          <span className="font-semibold text-emerald-600">
            {Math.round(days[6].calories)}
          </span>{" "}
          kcal
        </span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [summaries, setSummaries] = useState<Map<string, DaySummary>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetchMonthSummaries(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (selectedDate) fetchDayEntries(selectedDate);
  }, [selectedDate]);

  async function fetchMonthSummaries(year: number, month: number) {
    const days = getMonthDays(year, month);
    const results = await Promise.all(
      days.map(async (d) => {
        const dateStr = d.toISOString().split("T")[0];
        const res = await fetch(`/api/log?date=${dateStr}`);
        const entries: LogEntry[] = await res.json();
        if (entries.length === 0) return null;
        return {
          date: dateStr,
          calories: entries.reduce((s, e) => s + e.calories, 0),
          protein: entries.reduce((s, e) => s + e.protein, 0),
          carbs: entries.reduce((s, e) => s + e.carbs, 0),
          fat: entries.reduce((s, e) => s + e.fat, 0),
          entryCount: entries.length,
        } satisfies DaySummary;
      })
    );
    const map = new Map<string, DaySummary>();
    for (const r of results) if (r) map.set(r.date, r);
    setSummaries(map);
  }

  async function fetchDayEntries(date: string) {
    const res = await fetch(`/api/log?date=${date}`);
    setDayEntries(await res.json());
  }

  const days = getMonthDays(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Calendar intensity: scale day bg opacity by calorie count
  const maxCalInMonth = useMemo(() => {
    let max = 0;
    summaries.forEach((s) => { if (s.calories > max) max = s.calories; });
    return max || 1;
  }, [summaries]);

  const MEALS = ["breakfast", "lunch", "dinner", "snack"];
  const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">History</h1>

      <WeeklySparkline summaries={summaries} />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => {
          if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
          else setViewMonth((m) => m - 1);
        }}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-zinc-800">{monthName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
          onClick={() => {
            if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
            else setViewMonth((m) => m + 1);
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <motion.div
        className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs text-zinc-400 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map((day) => {
            const dateStr = day.toISOString().split("T")[0];
            const summary = summaries.get(dateStr);
            const isToday = dateStr === today.toISOString().split("T")[0];
            const isFuture = day > today;
            const isSelected = dateStr === selectedDate;

            // Intensity-based background for days with data
            const intensity = summary ? Math.max(0.08, Math.min(0.35, (summary.calories / maxCalInMonth) * 0.35)) : 0;

            return (
              <motion.button
                key={dateStr}
                disabled={isFuture}
                onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-colors relative ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm"
                    : isFuture
                    ? "text-zinc-200 cursor-default"
                    : isToday
                    ? "text-emerald-700 font-bold"
                    : summary
                    ? "text-zinc-700 hover:ring-1 hover:ring-emerald-200"
                    : "text-zinc-400 hover:bg-zinc-50"
                }`}
                style={
                  !isSelected && !isFuture && isToday
                    ? { backgroundColor: "rgba(16, 185, 129, 0.1)" }
                    : !isSelected && summary
                    ? { backgroundColor: `rgba(16, 185, 129, ${intensity})` }
                    : undefined
                }
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <span>{day.getDate()}</span>
                {summary && !isSelected && (
                  <span className={`text-[9px] ${isToday ? "text-emerald-500" : "text-zinc-400"}`}>
                    {Math.round(summary.calories)}
                  </span>
                )}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="font-semibold text-zinc-800 mb-3">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>

            {dayEntries.length === 0 ? (
              <div className="text-sm text-zinc-400 py-4 text-center">Nothing logged this day.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 text-sm bg-zinc-50/80 rounded-xl p-3">
                  <div className="text-center flex-1">
                    <div className="font-bold text-zinc-800">{Math.round(dayEntries.reduce((s, e) => s + e.calories, 0))}</div>
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">cal</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="font-bold" style={{ color: "#3b82f6" }}>{Math.round(dayEntries.reduce((s, e) => s + e.protein, 0))}g</div>
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">protein</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="font-bold" style={{ color: "#f59e0b" }}>{Math.round(dayEntries.reduce((s, e) => s + e.carbs, 0))}g</div>
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">carbs</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="font-bold" style={{ color: "#f43f5e" }}>{Math.round(dayEntries.reduce((s, e) => s + e.fat, 0))}g</div>
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">fat</div>
                  </div>
                </div>

                {MEALS.filter((m) => dayEntries.some((e) => e.meal === m)).map((meal) => (
                  <div key={meal}>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{MEAL_LABELS[meal]}</div>
                    <div className="space-y-1">
                      {dayEntries.filter((e) => e.meal === meal).map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700 truncate">{entry.food?.name ?? "Unknown"}</span>
                          <span className="text-zinc-400 shrink-0 ml-2">{Math.round(entry.calories)} cal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
