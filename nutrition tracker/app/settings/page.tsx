"use client";
import { useState, useEffect } from "react";
import { Check, Loader2, Sun, Moon, Monitor, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface Goals {
  calorie_goal: string;
  protein_goal: string;
  carbs_goal: string;
  fat_goal: string;
}

const MACRO_FIELDS = [
  { key: "protein_goal" as const, label: "Protein", unit: "g", calPerGram: 4 },
  { key: "carbs_goal" as const, label: "Carbs", unit: "g", calPerGram: 4 },
  { key: "fat_goal" as const, label: "Fat", unit: "g", calPerGram: 9 },
];

function calcCalories(goals: Goals): number {
  const p = Number(goals.protein_goal) || 0;
  const c = Number(goals.carbs_goal) || 0;
  const f = Number(goals.fat_goal) || 0;
  return p * 4 + c * 4 + f * 9;
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "Auto" },
  ] as const;

  return (
    <motion.div
      className="bg-[--color-surface] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
        Appearance
      </div>
      <div className="flex gap-2">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
              theme === value
                ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                : "border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:border-zinc-200 dark:hover:border-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setGoals);
  }, []);

  function updateMacro(key: string, value: string) {
    if (!goals) return;
    const updated = { ...goals, [key]: value };
    updated.calorie_goal = String(calcCalories(updated));
    setGoals(updated);
    setSaveError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!goals) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!res.ok) throw new Error("Failed to save");
      await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Couldn't save your targets. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!goals) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300 dark:text-zinc-600" />
      </div>
    );
  }

  const calories = calcCalories(goals);
  const inputClasses = "w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Targets</h1>

      <ThemeSelector />

      <motion.form
        onSubmit={handleSave}
        className="bg-[--color-surface] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5 space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Daily Targets
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Set your macro targets. Calories are calculated automatically.
        </p>

        {/* Calorie display — computed */}
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Calories (auto-calculated)</div>
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{calories.toLocaleString()}</div>
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 text-right leading-relaxed">
            P {Number(goals.protein_goal) || 0}g × 4 = {(Number(goals.protein_goal) || 0) * 4}<br />
            C {Number(goals.carbs_goal) || 0}g × 4 = {(Number(goals.carbs_goal) || 0) * 4}<br />
            F {Number(goals.fat_goal) || 0}g × 9 = {(Number(goals.fat_goal) || 0) * 9}
          </div>
        </div>

        {/* Macro inputs */}
        {MACRO_FIELDS.map(({ key, label, unit, calPerGram }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {label} ({unit}) — {calPerGram} cal/g
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className={inputClasses}
              value={goals[key]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateMacro(key, e.target.value)}
              required
            />
          </div>
        ))}

        {saveError && (
          <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save targets"
          )}
        </Button>
      </motion.form>
    </div>
  );
}
