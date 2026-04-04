"use client";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "./FoodSearchInput";

interface ServingSelectorProps {
  food: SearchResult;
  meal: string;
  onConfirm: (food: SearchResult, servings: number) => void;
  onBack: () => void;
  loading?: boolean;
}

export function ServingSelector({ food, meal, onConfirm, onBack, loading }: ServingSelectorProps) {
  const [servings, setServings] = useState(1);

  const scaledCalories = Math.round(food.calories * servings);
  const scaledProtein = Math.round(food.protein * servings * 10) / 10;
  const scaledCarbs = Math.round(food.carbs * servings * 10) / 10;
  const scaledFat = Math.round(food.fat * servings * 10) / 10;

  const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

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
        <label className="text-sm font-medium text-zinc-700 block mb-2">Servings</label>
        <div className="flex gap-2 mb-3">
          {QUICK_SERVINGS.map((s) => (
            <button
              key={s}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                servings === s
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-zinc-200 text-zinc-600 hover:border-emerald-400"
              }`}
              onClick={() => setServings(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={servings}
          onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
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
        onClick={() => onConfirm(food, servings)}
        disabled={loading}
      >
        {loading ? "Logging..." : `Add to ${meal.charAt(0).toUpperCase() + meal.slice(1)}`}
      </Button>
    </div>
  );
}
