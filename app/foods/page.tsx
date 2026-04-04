"use client";
import { useState, useEffect } from "react";
import { Star, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

      {showAddForm && (
        <AddFoodForm
          onSaved={(food) => { setFoods((prev) => [food, ...prev]); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
        {(["all", "custom", "favorites"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white shadow text-zinc-900" : "text-zinc-500"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">
          {tab === "favorites" ? "No favorites yet — star a food to save it here." : "No foods found."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((food) =>
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
              <FoodRow
                key={food.id}
                food={food}
                onFavorite={toggleFavorite}
                onEdit={() => setEditingId(food.id)}
                onDelete={() => deleteFood(food.id)}
              />
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
        <Star
          className={`h-4 w-4 ${food.is_favorite ? "text-amber-400 fill-amber-400" : "text-zinc-200 hover:text-amber-300"}`}
        />
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
      <div className="flex gap-2">
        <input
          className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Food name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        <input
          className="w-32 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Brand"
          value={form.brand}
          onChange={(e) => set("brand", e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="number" min="0.1" step="any"
          className="w-24 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Size"
          value={form.serving_size}
          onChange={(e) => set("serving_size", parseFloat(e.target.value))}
        />
        <input
          className="w-24 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Unit"
          value={form.serving_unit}
          onChange={(e) => set("serving_unit", e.target.value)}
        />
        <input
          type="number" min="0" step="any"
          className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Calories *"
          value={form.calories}
          onChange={(e) => set("calories", parseFloat(e.target.value))}
          required
        />
      </div>
      <div className="flex gap-2">
        {(["protein", "carbs", "fat"] as const).map((m) => (
          <input
            key={m}
            type="number" min="0" step="any"
            className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={`${m.charAt(0).toUpperCase() + m.slice(1)} g`}
            value={form[m]}
            onChange={(e) => set(m, parseFloat(e.target.value) || 0)}
          />
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
