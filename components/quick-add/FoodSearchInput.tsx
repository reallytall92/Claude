"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Star } from "lucide-react";

export interface SearchResult {
  id?: number;
  name: string;
  brand?: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  source?: string;
  external_id?: string;
  is_favorite?: number;
  _cached?: boolean;
}

interface FoodSearchInputProps {
  onSelect: (food: SearchResult) => void;
}

export function FoodSearchInput({ onSelect }: FoodSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 space-y-0.5 max-h-80 overflow-y-auto">
          {results.map((food, i) => (
            <button
              key={food.id ?? `${food.external_id}-${i}`}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors group"
              onClick={() => onSelect(food)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-zinc-800 text-sm truncate">{food.name}</span>
                    {food.is_favorite === 1 && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {food.brand && <span className="mr-1.5">{food.brand} ·</span>}
                    {food.serving_size}{food.serving_unit}
                    {food.source && !food._cached && (
                      <span className="ml-1.5 uppercase text-[10px] font-medium text-zinc-300">
                        {food.source}
                      </span>
                    )}
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
      )}

      {query.trim() && !loading && results.length === 0 && (
        <div className="mt-8 text-center text-sm text-zinc-400">No results for &ldquo;{query}&rdquo;</div>
      )}
    </div>
  );
}
