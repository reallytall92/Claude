"use client";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FoodSearchInput, type SearchResult } from "./FoodSearchInput";
import { ServingSelector } from "./ServingSelector";
import { ImageScanner } from "./ImageScanner";
import { FavoriteFoods } from "./FavoriteFoods";
import { SavedMealsList } from "./SavedMealsList";

interface QuickAddDrawerProps {
  open: boolean;
  meal: string;
  date?: string;
  onClose: () => void;
  onAdded: (entry: object) => void;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function QuickAddDrawer({ open, meal, date, onClose, onAdded }: QuickAddDrawerProps) {
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);
  const [logging, setLogging] = useState(false);
  const [addedName, setAddedName] = useState<string | null>(null);

  // Clear flash message after 1.5s
  useEffect(() => {
    if (!addedName) return;
    const t = setTimeout(() => setAddedName(null), 1500);
    return () => clearTimeout(t);
  }, [addedName]);

  function handleClose() {
    setSelectedFood(null);
    setAddedName(null);
    onClose();
  }

  async function handleConfirm(food: SearchResult, servings: number) {
    setLogging(true);
    const ratio = servings;

    const body = {
      meal,
      date,
      servings,
      calories: Math.round(food.calories * ratio * 10) / 10,
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      ...(food.id
        ? { food_id: food.id }
        : {
            foodData: {
              name: food.name,
              brand: food.brand ?? null,
              serving_size: food.serving_size,
              serving_unit: food.serving_unit,
              serving_weight_grams: food.serving_weight_grams ?? null,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fiber: food.fiber ?? null,
              sugar: food.sugar ?? null,
              source: food.source ?? "custom",
              external_id: food.external_id ?? null,
            },
          }),
    };

    try {
      const res = await fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const entry = await res.json();
      onAdded(entry);
      // Stay in drawer — go back to tabs and show flash
      setSelectedFood(null);
      setAddedName(food.name);
    } finally {
      setLogging(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Add to {MEAL_LABELS[meal] ?? meal}</SheetTitle>
        </SheetHeader>

        {/* "Added!" flash */}
        <AnimatePresence>
          {addedName && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-6 mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
            >
              <Check className="h-4 w-4" />
              {addedName} added
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {selectedFood ? (
            <ServingSelector
              food={selectedFood}
              meal={meal}
              onConfirm={handleConfirm}
              onBack={() => setSelectedFood(null)}
              loading={logging}
            />
          ) : (
            <Tabs defaultValue="favorites">
              <TabsList className="mb-4">
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="scan">Scan Label</TabsTrigger>
                <TabsTrigger value="meals">Meals</TabsTrigger>
              </TabsList>
              <TabsContent value="favorites">
                <FavoriteFoods onSelect={setSelectedFood} />
              </TabsContent>
              <TabsContent value="search">
                <FoodSearchInput onSelect={setSelectedFood} />
              </TabsContent>
              <TabsContent value="scan">
                <ImageScanner onScanned={setSelectedFood} />
              </TabsContent>
              <TabsContent value="meals">
                <SavedMealsList
                  meal={meal}
                  date={date}
                  onAdded={(entries) => {
                    entries.forEach((e) => onAdded(e));
                    setAddedName(`${entries.length} items`);
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Done button — visible when on tabs view (not selecting a food) */}
        {!selectedFood && (
          <div className="px-6 pb-6 pt-2">
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
