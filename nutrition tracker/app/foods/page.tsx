"use client";
import { useState, useEffect } from "react";
import { Star, Pencil, Trash2, Plus, Check, X, UtensilsCrossed, Camera, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ImageScanner } from "@/components/quick-add/ImageScanner";
import { FoodSearchInput, type SearchResult } from "@/components/quick-add/FoodSearchInput";

const UNIT_OPTIONS = ["serving", "g", "oz", "cup", "Tbsp", "tsp", "ml", "piece", "slice", "scoop"];

function unitOptions(currentValue: string): string[] {
  if (UNIT_OPTIONS.includes(currentValue)) return UNIT_OPTIONS;
  return [...UNIT_OPTIONS, currentValue];
}

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
  serving_weight_grams?: number | null;
  default_servings?: number | null;
  default_unit?: string | null;
  source?: string;
  is_favorite: number;
}

type Tab = "all" | "custom" | "favorites" | "meals";

interface SavedMealItem {
  id: number;
  food_id: number;
  servings: number;
  food_name: string;
  food_calories: number;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
  food_serving_size: number;
  food_serving_unit: string;
}

interface SavedMeal {
  id: number;
  name: string;
  items: SavedMealItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export default function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [meals, setMeals] = useState<SavedMeal[]>([]);

  useEffect(() => { fetchFoods(); fetchMeals(); }, []);

  async function fetchFoods() {
    const res = await fetch("/api/foods");
    setFoods(await res.json());
  }

  async function fetchMeals() {
    const res = await fetch("/api/saved-meals");
    setMeals(await res.json());
  }

  async function saveMeal(id: number, name: string, items: Array<{ food_id: number; servings: number }>) {
    await fetch(`/api/saved-meals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
    await fetchMeals();
  }

  async function deleteMeal(id: number) {
    if (!confirm("Delete this saved meal?")) return;
    await fetch(`/api/saved-meals/${id}`, { method: "DELETE" });
    setMeals((prev) => prev.filter((m) => m.id !== id));
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
        <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{tab === "meals" ? "Saved Meals" : "Food Library"}</h1>
        {tab !== "meals" && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            Add custom
          </Button>
        )}
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
      <div className="relative flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
        {(["all", "custom", "favorites", "meals"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`relative flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors z-10 ${
              tab === t ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
            }`}
            onClick={() => setTab(t)}
          >
            {tab === t && (
              <motion.div
                layoutId="foods-tab-bg"
                className="absolute inset-0 bg-white dark:bg-zinc-700 shadow rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </div>

      {tab === "meals" ? (
        <MealsTab meals={meals} onSave={saveMeal} onDelete={deleteMeal} />
      ) : filtered.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <UtensilsCrossed className="h-10 w-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 dark:text-zinc-500 text-sm">
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
    <div className="bg-[--color-surface] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm px-4 py-3 flex items-center gap-3">
      <button onClick={() => onFavorite(food)} className="shrink-0">
        <motion.div whileTap={{ scale: 1.3 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
          <Star
            className={`h-4 w-4 transition-colors ${food.is_favorite ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700 hover:text-amber-300 dark:hover:text-amber-400"}`}
          />
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200 text-sm truncate">{food.name}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
          {food.brand && <span className="mr-1.5">{food.brand} ·</span>}
          {food.serving_size}{food.serving_unit}
          {food.default_servings != null && food.default_servings > 0 && (
            <span className="text-emerald-500 dark:text-emerald-400"> · default {food.default_servings}{food.default_unit ?? food.serving_unit}</span>
          )}
          {" "}·{" "}
          <span className="font-medium text-zinc-600 dark:text-zinc-400">{Math.round(food.calories)} cal</span>
          <span className="ml-1.5">P{food.protein}g C{food.carbs}g F{food.fat}g</span>
        </div>
      </div>

      <div className="flex gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Pencil className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
          <Trash2 className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        </Button>
      </div>
    </div>
  );
}

interface EditItem {
  food_id: number;
  food_name: string;
  food_calories: number;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
  food_serving_size: number;
  food_serving_unit: string;
  amount: number; // actual amount in the food's unit (servings × serving_size)
}

function mealItemToEditItem(item: SavedMealItem): EditItem {
  return {
    food_id: item.food_id,
    food_name: item.food_name,
    food_calories: item.food_calories,
    food_protein: item.food_protein,
    food_carbs: item.food_carbs,
    food_fat: item.food_fat,
    food_serving_size: item.food_serving_size,
    food_serving_unit: item.food_serving_unit,
    amount: item.servings * item.food_serving_size,
  };
}

function editItemServings(item: EditItem): number {
  return item.food_serving_size > 0 ? item.amount / item.food_serving_size : item.amount;
}

function editItemMacros(item: EditItem) {
  const s = editItemServings(item);
  return {
    calories: Math.round(item.food_calories * s),
    protein: Math.round(item.food_protein * s),
    carbs: Math.round(item.food_carbs * s),
    fat: Math.round(item.food_fat * s),
  };
}

function MealsTab({
  meals,
  onSave,
  onDelete,
}: {
  meals: SavedMeal[];
  onSave: (id: number, name: string, items: Array<{ food_id: number; servings: number }>) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddFood, setShowAddFood] = useState(false);

  function startEditing(meal: SavedMeal) {
    setEditingId(meal.id);
    setEditName(meal.name);
    setEditItems(meal.items.map(mealItemToEditItem));
    setShowAddFood(false);
  }

  function updateAmount(idx: number, amount: number) {
    setEditItems((prev) => prev.map((item, i) => (i === idx ? { ...item, amount } : item)));
  }

  function removeItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addFood(food: SearchResult) {
    setEditItems((prev) => [
      ...prev,
      {
        food_id: food.id!,
        food_name: food.name,
        food_calories: food.calories,
        food_protein: food.protein,
        food_carbs: food.carbs,
        food_fat: food.fat,
        food_serving_size: food.serving_size,
        food_serving_unit: food.serving_unit,
        amount: food.serving_size,
      },
    ]);
    setShowAddFood(false);
  }

  async function handleSave() {
    if (!editName.trim() || editItems.length === 0) return;
    setSaving(true);
    await onSave(
      editingId!,
      editName.trim(),
      editItems.map((item) => ({ food_id: item.food_id, servings: editItemServings(item) }))
    );
    setEditingId(null);
    setSaving(false);
  }

  if (meals.length === 0) {
    return (
      <motion.div
        className="text-center py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Bookmark className="h-10 w-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">
          No saved meals yet — save a meal from the Today page.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {meals.map((meal, i) => (
        <motion.div
          key={meal.id}
          className="bg-[--color-surface] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm px-4 py-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
        >
          {editingId === meal.id ? (
            <div className="space-y-3">
              <input
                className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Meal name"
                autoFocus
              />

              <div className="space-y-1">
                {editItems.map((item, idx) => {
                  const macros = editItemMacros(item);
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-800 dark:text-zinc-200 truncate">{item.food_name}</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {macros.calories} cal · P{macros.protein}g C{macros.carbs}g F{macros.fat}g
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          className="w-16 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={item.amount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateAmount(idx, parseFloat(e.target.value) || 0.1)}
                        />
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 min-w-[2rem]">{item.food_serving_unit}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                          <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {editItems.length === 0 && (
                <p className="text-xs text-red-500 text-center py-2">A meal needs at least one item.</p>
              )}

              {showAddFood ? (
                <div className="space-y-2">
                  <FoodSearchInput onSelect={addFood} />
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAddFood(false)}>
                    Cancel search
                  </Button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 active:text-emerald-700 dark:active:text-emerald-300 py-2 px-1 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
                  onClick={() => setShowAddFood(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add food
                </button>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || editItems.length === 0 || !editName.trim()}>
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200 text-sm truncate">{meal.name}</div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    {meal.items.map((item) => item.food_name).join(", ")}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(meal)}>
                    <Pencil className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(meal.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">{Math.round(meal.totals.calories)} cal</span>
                <span>P {Math.round(meal.totals.protein)}g</span>
                <span>C {Math.round(meal.totals.carbs)}g</span>
                <span>F {Math.round(meal.totals.fat)}g</span>
                <span>{meal.items.length} items</span>
              </div>
            </>
          )}
        </motion.div>
      ))}
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
    serving_weight_grams: food?.serving_weight_grams ?? ("" as number | ""),
    default_servings: food?.default_servings ?? "",
    default_unit: food?.default_unit ?? food?.serving_unit ?? "serving",
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
      serving_weight_grams: result.serving_weight_grams ?? "",
      default_servings: "",
      default_unit: result.serving_unit,
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
      body: JSON.stringify({
        ...form,
        serving_weight_grams: form.serving_weight_grams === "" ? null : Number(form.serving_weight_grams),
        default_servings: form.default_servings === "" ? null : Number(form.default_servings),
        default_unit: form.default_servings === "" ? null : form.default_unit,
        source: "custom",
      }),
    });
    const saved = await res.json();
    setSaving(false);
    onSaved(saved);
  }

  const inputClasses = "w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow placeholder:text-zinc-400 dark:placeholder:text-zinc-500";
  const selectClasses = "w-full min-w-0 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow";

  return (
    <form onSubmit={handleSubmit} className="bg-[--color-surface] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 space-y-3">
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
        <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 rounded-xl px-3 py-2">
          Label scanned — review the info below and add a name.
        </div>
      )}
      <input
        className={inputClasses}
        placeholder="Food name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        required
        autoFocus={scanned}
      />
      <input
        className={inputClasses}
        placeholder="Brand"
        value={form.brand}
        onChange={(e) => set("brand", e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Serving size</label>
          <input
            type="number" min="0.1" step="any"
            className={`min-w-0 ${inputClasses}`}
            value={form.serving_size}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set("serving_size", parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Unit</label>
          <select
            className={`min-w-0 ${selectClasses}`}
            value={form.serving_unit}
            onChange={(e) => set("serving_unit", e.target.value)}
          >
            {unitOptions(form.serving_unit).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Calories</label>
          <input
            type="number" min="0" step="any"
            className={`min-w-0 ${inputClasses}`}
            value={form.calories}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set("calories", parseFloat(e.target.value))}
            required
          />
        </div>
      </div>
      {form.serving_unit !== "g" && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Grams per serving — optional
          </label>
          <input
            type="number" min="0" step="any"
            className={inputClasses}
            placeholder={`How many grams is ${form.serving_size} ${form.serving_unit}?`}
            value={form.serving_weight_grams}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set("serving_weight_grams", e.target.value === "" ? "" : parseFloat(e.target.value))}
          />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Enables logging by grams.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {(["protein", "carbs", "fat"] as const).map((m) => (
          <div key={m}>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{m.charAt(0).toUpperCase() + m.slice(1)} (g)</label>
            <input
              type="number" min="0" step="any"
              className={`min-w-0 ${inputClasses}`}
              value={form[m]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => set(m, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Default amount — optional
        </label>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="any"
            className={`flex-1 min-w-0 ${inputClasses}`}
            placeholder="e.g. 250"
            value={form.default_servings}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set("default_servings", e.target.value === "" ? "" : parseFloat(e.target.value))}
          />
          <select
            className={`min-w-0 ${selectClasses}`}
            value={form.default_unit}
            onChange={(e) => set("default_unit", e.target.value)}
          >
            {unitOptions(form.default_unit).map((u) => (
              <option key={u} value={u}>{u === "serving" ? "servings" : u}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Pre-fills this amount when logging. Leave blank for 1 serving.</p>
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
