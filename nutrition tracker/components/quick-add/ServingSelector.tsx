"use client";
import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "./FoodSearchInput";

type UnitMode = "servings" | "unit" | "grams";

interface ServingSelectorProps {
  food: SearchResult;
  meal: string;
  onConfirm: (food: SearchResult, servings: number) => void;
  onBack: () => void;
  loading?: boolean;
}

function isGramLike(unit: string): boolean {
  return ["g", "gram", "grams"].includes(unit.toLowerCase());
}

function normalizeUnit(u: string): string {
  return u.toLowerCase().replace(/s$/, "");
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10) / 10);
}

export function ServingSelector({ food, meal, onConfirm, onBack, loading }: ServingSelectorProps) {
  const isGramUnit = isGramLike(food.serving_unit);
  const isServingUnit = food.serving_unit.toLowerCase() === "serving";
  const hasGramWeight = food.serving_weight_grams != null && food.serving_weight_grams > 0;

  const unitModes = useMemo(() => {
    const modes: { mode: UnitMode; label: string }[] = [
      { mode: "servings", label: "Servings" },
    ];

    if (!isServingUnit && !isGramUnit) {
      modes.push({ mode: "unit", label: food.serving_unit });
    }

    modes.push({ mode: "grams", label: "Grams" });

    return modes;
  }, [food.serving_unit, isGramUnit, isServingUnit]);

  // Determine initial unit mode from saved default
  const defaultUnit = food.default_unit;
  const initialUnitMode: UnitMode = (() => {
    if (!defaultUnit || food.default_servings == null) return "servings";
    const norm = normalizeUnit(defaultUnit);
    if (norm === "serving") return "servings";
    if (isGramLike(defaultUnit)) return "grams";
    // Match against the food's native unit (handles plural/case differences like "piece" vs "pieces")
    if (!isServingUnit && !isGramUnit && normalizeUnit(food.serving_unit) === norm) return "unit";
    return "servings";
  })();

  const hasDefault = food.default_servings != null && food.default_servings > 0 && defaultUnit != null;
  const initialAmount = hasDefault ? food.default_servings! : 1;
  const [unitMode, setUnitMode] = useState<UnitMode>(initialUnitMode);
  const [amount, setAmount] = useState(initialAmount);
  const [inputValue, setInputValue] = useState(formatAmount(initialAmount));

  function toServings(mode: UnitMode, value: number): number {
    switch (mode) {
      case "servings":
        return value;
      case "unit":
        return value / food.serving_size;
      case "grams":
        if (isGramUnit) return value / food.serving_size;
        if (hasGramWeight) return value / food.serving_weight_grams!;
        // Fallback: treat serving_size as gram weight per serving
        return value / food.serving_size;
    }
  }

  const servingsRatio = toServings(unitMode, amount);

  const scaledCalories = Math.round(food.calories * servingsRatio);
  const scaledProtein = Math.round(food.protein * servingsRatio * 10) / 10;
  const scaledCarbs = Math.round(food.carbs * servingsRatio * 10) / 10;
  const scaledFat = Math.round(food.fat * servingsRatio * 10) / 10;

  function getQuickPicks(): number[] {
    const multipliers = [0.5, 1, 1.5, 2, 3];
    switch (unitMode) {
      case "servings":
        return multipliers;
      case "unit":
        return multipliers.map((m) => Math.round(food.serving_size * m * 10) / 10);
      case "grams": {
        const g = isGramUnit ? food.serving_size : (food.serving_weight_grams ?? food.serving_size);
        return multipliers.map((m) => Math.round(g * m));
      }
    }
  }

  function setAmountAndInput(value: number) {
    setAmount(value);
    setInputValue(formatAmount(value));
  }

  function switchMode(newMode: UnitMode) {
    setUnitMode(newMode);
    // Default to 1 serving equivalent in the new mode
    switch (newMode) {
      case "servings":
        setAmountAndInput(1);
        break;
      case "unit":
        setAmountAndInput(food.serving_size);
        break;
      case "grams":
        setAmountAndInput(isGramUnit ? food.serving_size : (food.serving_weight_grams ?? food.serving_size));
        break;
    }
  }

  const quickPicks = getQuickPicks();

  return (
    <div>
      <button
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="bg-zinc-50 rounded-xl p-4 mb-4">
        <div className="font-semibold text-zinc-800 mb-0.5">{food.name}</div>
        {food.brand && <div className="text-xs text-zinc-400 mb-2">{food.brand}</div>}
        <div className="text-xs text-zinc-500">
          Per serving: {food.serving_size}{food.serving_unit} · {Math.round(food.calories)} cal ·
          P {food.protein}g · C {food.carbs}g · F {food.fat}g
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-zinc-700 block mb-2">Amount</label>
        {unitModes.length > 1 && (
          <select
            className="w-full mb-3 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={unitMode}
            onChange={(e) => switchMode(e.target.value as UnitMode)}
          >
            {unitModes.map(({ mode, label }) => (
              <option key={mode} value={mode}>{label}</option>
            ))}
          </select>
        )}
        <div className="flex gap-2 mb-3">
          {quickPicks.map((s) => (
            <button
              key={s}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                amount === s
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-zinc-200 text-zinc-600 hover:border-emerald-400"
              }`}
              onClick={() => setAmountAndInput(s)}
            >
              {formatAmount(s)}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
              setInputValue(raw);
              const parsed = parseFloat(raw);
              if (!isNaN(parsed) && parsed > 0) {
                setAmount(parsed);
              }
            }
          }}
          onBlur={() => {
            const parsed = parseFloat(inputValue);
            if (isNaN(parsed) || parsed <= 0) {
              setAmountAndInput(0.1);
            } else {
              setInputValue(formatAmount(parsed));
            }
          }}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-emerald-50 rounded-xl p-3 mb-5 flex justify-between items-center">
        <div className="text-sm text-emerald-800">
          <span className="font-semibold text-lg text-emerald-700">{scaledCalories}</span>
          <span className="ml-1">cal</span>
        </div>
        <div className="text-xs text-emerald-600 space-x-2">
          <span>P {scaledProtein}g</span>
          <span>C {scaledCarbs}g</span>
          <span>F {scaledFat}g</span>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => onConfirm(food, servingsRatio)}
        disabled={loading}
      >
        {loading ? "Logging..." : `Add to ${meal.charAt(0).toUpperCase() + meal.slice(1)}`}
      </Button>
    </div>
  );
}
