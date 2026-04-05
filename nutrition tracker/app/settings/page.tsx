"use client";
import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

interface Goals {
  calorie_goal: string;
  protein_goal: string;
  carbs_goal: string;
  fat_goal: string;
}

const FIELDS = [
  { key: "calorie_goal" as const, label: "Calories", unit: "kcal" },
  { key: "protein_goal" as const, label: "Protein", unit: "g" },
  { key: "carbs_goal" as const, label: "Carbs", unit: "g" },
  { key: "fat_goal" as const, label: "Fat", unit: "g" },
];

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setGoals);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!goals) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goals),
    });
    await res.json();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!goals) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-800">Daily Targets</h1>

      <motion.form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm text-zinc-500">
          Set your daily nutrition goals. These are used on the Today dashboard to track your progress.
        </p>

        {FIELDS.map(({ key, label, unit }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {label} ({unit})
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              value={goals[key]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setGoals({ ...goals, [key]: e.target.value })}
              required
            />
          </div>
        ))}

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
