"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    // Fetch all days in the month in parallel (batched for performance)
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

  const MEALS = ["breakfast", "lunch", "dinner", "snack"];
  const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">History</h1>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => {
          if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
          else setViewMonth(m => m - 1);
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
            if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
            else setViewMonth(m => m + 1);
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
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

            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-colors relative ${
                  isSelected
                    ? "bg-emerald-600 text-white"
                    : isFuture
                    ? "text-zinc-200 cursor-default"
                    : isToday
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : summary
                    ? "bg-zinc-50 hover:bg-emerald-50 text-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-50"
                }`}
              >
                <span>{day.getDate()}</span>
                {summary && !isSelected && (
                  <span className={`text-[9px] ${isToday ? "text-emerald-500" : "text-zinc-400"}`}>
                    {Math.round(summary.calories)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <div className="font-semibold text-zinc-800 mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>

          {dayEntries.length === 0 ? (
            <div className="text-sm text-zinc-400 py-4 text-center">Nothing logged this day.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm bg-zinc-50 rounded-xl p-3">
                <div className="text-center flex-1">
                  <div className="font-bold text-zinc-800">{Math.round(dayEntries.reduce((s, e) => s + e.calories, 0))}</div>
                  <div className="text-xs text-zinc-400">cal</div>
                </div>
                <div className="text-center flex-1">
                  <div className="font-semibold text-blue-600">{Math.round(dayEntries.reduce((s, e) => s + e.protein, 0))}g</div>
                  <div className="text-xs text-zinc-400">protein</div>
                </div>
                <div className="text-center flex-1">
                  <div className="font-semibold text-amber-600">{Math.round(dayEntries.reduce((s, e) => s + e.carbs, 0))}g</div>
                  <div className="text-xs text-zinc-400">carbs</div>
                </div>
                <div className="text-center flex-1">
                  <div className="font-semibold text-rose-600">{Math.round(dayEntries.reduce((s, e) => s + e.fat, 0))}g</div>
                  <div className="text-xs text-zinc-400">fat</div>
                </div>
              </div>

              {MEALS.filter((m) => dayEntries.some((e) => e.meal === m)).map((meal) => (
                <div key={meal}>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{MEAL_LABELS[meal]}</div>
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
        </div>
      )}
    </div>
  );
}
