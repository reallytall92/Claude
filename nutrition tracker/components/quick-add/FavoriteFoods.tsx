"use client";
import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import type { SearchResult } from "./FoodSearchInput";

interface FavoriteFoodsProps {
  onSelect: (food: SearchResult) => void;
}

export function FavoriteFoods({ onSelect }: FavoriteFoodsProps) {
  const [favorites, setFavorites] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/foods");
        const data: SearchResult[] = await res.json();
        setFavorites(data.filter((f) => f.is_favorite === 1));
      } catch {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-8 text-center text-sm text-zinc-400">
        No favorites yet — star a food in your Food Library to save it here.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {favorites.map((food) => (
        <button
          key={food.id}
          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
          onClick={() => onSelect(food)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                <span className="font-medium text-zinc-800 text-sm truncate">{food.name}</span>
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {food.brand && <span className="mr-1.5">{food.brand} ·</span>}
                {food.serving_size}{food.serving_unit}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-zinc-700 text-sm">{Math.round(food.calories)} cal</div>
              <div className="text-[11px] text-zinc-400">
                P{Math.round(food.protein)} C{Math.round(food.carbs)} F{Math.round(food.fat)}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
