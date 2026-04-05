"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FoodSearchInput, type SearchResult } from "./FoodSearchInput";
import { ServingSelector } from "./ServingSelector";
import { ImageScanner } from "./ImageScanner";
import { FavoriteFoods } from "./FavoriteFoods";

interface QuickAddDrawerProps {
  open: boolean;
  meal: string;
  onClose: () => void;
  onAdded: (entry: object) => void;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function QuickAddDrawer({ open, meal, onClose, onAdded }: QuickAddDrawerProps) {
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);
  const [logging, setLogging] = useState(false);

  function handleClose() {
    setSelectedFood(null);
    onClose();
  }

  async function handleConfirm(food: SearchResult, servings: number) {
    setLogging(true);
    const ratio = servings;

    const body = {
      meal,
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
      handleClose();
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
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
