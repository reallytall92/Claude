"use client";
import { useState, useEffect } from "react";
import { Star, Pencil, Trash2, Plus, Check, X, UtensilsCrossed, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ImageScanner } from "@/components/quick-add/ImageScanner";
import type { SearchResult } from "@/components/quick-add/FoodSearchInput";

interface Food {
  id: number;
  name: string;
  brand?: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string;
  is_favorite: number;
}

type Tab = "all" | "custom" | "favorites";

export default function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => { fetchFoods(); }, []);

  async function fetchFoods() {
    const res = await fetch("/api/foods");
    setFoods(await res.json());
  }

  async function toggleFavorite(food: Food) {
    const res = await fetch(`/api/foods/${food.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: food.is_favorite ? 0 : 1 }),
    });
    const updated = await res.json();
    setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, ...updated } : f)));
  }

  async function deleteFood(id: number) {
    if (!confirm("Delete this food?")) return;
    await fetch(`/api/foods/${id}`, { method: "DELETE" });
    setFoods((prev) => prev.filter((f) => f.id !== id));
  }

  const filtered = foods.filter((f) => {
    if (tab === "custom") return f.source === "custom" || f.source === "scanned";
    if (tab === "favorites") return f.is_favorite === 1;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-800">Food Library</h1>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" />
          Add custom
        </Button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <AddFoodForm
              onSaved={(food) => { setFoods((prev) => [food, ...prev]); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar with animated indicator */}
      <div className="relative flex gap-1 bg-zinc-100 p-1 rounded-xl">
        {(["all", "custom", "favorites"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`relative flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors z-10 ${
              tab === t ? "text-zinc-900" : "text-zinc-500"
            }`}
            onClick={() => setTab(t)}
          >
            {tab === t && (
              <motion.div
                layoutId="foods-tab-bg"
                className="absolute inset-0 bg-white shadow rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <UtensilsCrossed className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            {tab === "favorites" ? "No favorites yet — star a food to save it here." : "No foods found."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((food, i) =>
            editingId === food.id ? (
              <EditFoodForm
                key={food.id}
                food={food}
                onSaved={(updated) => {
                  setFoods((prev) => prev.map((f) => (f.id === food.id ? updated : f)));
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
              >
                <FoodRow
                  food={food}
                  onFavorite={toggleFavorite}
                  onEdit={() => setEditingId(food.id)}
                  onDelete={() => deleteFood(food.id)}
                />
              </motion.div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function FoodRow({
  food,
  onFavorite,
  onEdit,
  onDelete,
}: {
  food: Food;
  onFavorite: (f: Food) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <button onClick={() => onFavorite(food)} className="shrink-0">
        <motion.div whileTap={{ scale: 1.3 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
          <Star
            className={`h-4 w-4 transition-colors ${food.is_favorite ? "text-amber-400 fill-amber-400" : "text-zinc-200 hover:text-amber-300"}`}
          />
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-zinc-800 text-sm truncate">{food.name}</div>
        <div className="text-xs text-zinc-400 truncate">
          {food.brand && <span className="mr-1.5">{food.brand} ·</span>}
          {food.serving_size}{food.serving_unit} ·{" "}
          <span className="font-medium text-zinc-600">{Math.round(food.calories)} cal</span>
          <span className="ml-1.5">P{food.protein}g C{food.carbs}g F{food.fat}g</span>
        </div>
      </div>

      <div className="flex gap-0.5 shrink-0">
        {(food.source === "custom" || food.source === "scanned" || !food.source) && (
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
          <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
        </Button>
      </div>
    </div>
  );
}

function AddFoodForm({ onSaved, onCancel }: { onSaved: (f: Food) => void; onCancel: () => void }) {
  return <FoodForm food={null} onSaved={onSaved} onCancel={onCancel} />;
}

function EditFoodForm({ food, onSaved, onCancel }: { food: Food; onSaved: (f: Food) => void; onCancel: () => void }) {
  return <FoodForm food={food} onSaved={onSaved} onCancel={onCancel} />;
}

function FoodForm({
  food,
  onSaved,
  onCancel,
}: {
  food: Food | null;
  onSaved: (f: Food) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: food?.name ?? "",
    brand: food?.brand ?? "",
    serving_size: food?.serving_size ?? 1,
    serving_unit: food?.serving_unit ?? "serving",
    calories: food?.calories ?? 0,
    protein: food?.protein ?? 0,
    carbs: food?.carbs ?? 0,
    fat: food?.fat ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  function handleScanned(result: SearchResult) {
    setForm({
      name: result.name ?? "",
      brand: "",
      serving_size: result.serving_size,
      serving_unit: result.serving_unit,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
    });
    setScanning(false);
    setScanned(true);
  }

  function set(key: string, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = food ? `/api/foods/${food.id}` : "/api/foods";
    const method = food ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "custom" }),
    });
    const saved = await res.json();
    setSaving(false);
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-3">
      {!food && !scanned && (
        scanning ? (
          <div className="space-y-2">
            <ImageScanner onScanned={handleScanned} />
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setScanning(false)}>
              Fill in manually instead
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setScanning(true)}>
            <Camera className="h-4 w-4" /> Scan nutrition label
          </Button>
        )
      )}
      {scanned && (
        <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
          Label scanned — review the info below and add a name.
        </div>
      )}
      <input
        className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
        placeholder="Food name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        required
        autoFocus={scanned}
      />
      <input
        className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
        placeholder="Brand"
        value={form.brand}
        onChange={(e) => set("brand", e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Serving size</label>
          <input
            type="number" min="0.1" step="any"
            className="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={form.serving_size}
            onChange={(e) => set("serving_size", parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Unit</label>
          <select
            className="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={form.serving_unit}
            onChange={(e) => set("serving_unit", e.target.value)}
          >
            <option value="serving">serving</option>
            <option value="g">g</option>
            <option value="oz">oz</option>
            <option value="cup">cup</option>
            <option value="Tbsp">Tbsp</option>
            <option value="tsp">tsp</option>
            <option value="ml">ml</option>
            <option value="piece">piece</option>
            <option value="slice">slice</option>
            <option value="scoop">scoop</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Calories</label>
          <input
            type="number" min="0" step="any"
            className="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={form.calories}
            onChange={(e) => set("calories", parseFloat(e.target.value))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["protein", "carbs", "fat"] as const).map((m) => (
          <div key={m}>
            <label className="block text-xs font-medium text-zinc-500 mb-1">{m.charAt(0).toUpperCase() + m.slice(1)} (g)</label>
            <input
              type="number" min="0" step="any"
              className="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              value={form[m]}
              onChange={(e) => set(m, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving..." : food ? "Save changes" : "Add food"}
        </Button>
      </div>
    </form>
  );
}
