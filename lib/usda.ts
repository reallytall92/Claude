export interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
  servingSize?: number;
  servingSizeUnit?: string;
}

function getNutrient(food: USDAFood, ids: number[]): number {
  for (const id of ids) {
    const n = food.foodNutrients.find((n) => n.nutrientId === id);
    if (n) return n.value ?? 0;
  }
  return 0;
}

export function usdaFoodToLocal(food: USDAFood) {
  // Nutrient IDs: calories=1008, protein=1003, carbs=1005, fat=1004, fiber=1079, sugar=2000
  const calories = getNutrient(food, [1008]);
  const protein = getNutrient(food, [1003]);
  const carbs = getNutrient(food, [1005]);
  const fat = getNutrient(food, [1004]);
  const fiber = getNutrient(food, [1079]) || null;
  const sugar = getNutrient(food, [2000]) || null;

  return {
    name: food.description,
    brand: food.brandOwner ?? null,
    serving_size: food.servingSize ?? 100,
    serving_unit: food.servingSizeUnit ?? "g",
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    source: "usda" as const,
    external_id: `usda_${food.fdcId}`,
  };
}

export async function searchUSDA(query: string) {
  const key = process.env.USDA_API_KEY ?? "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${key}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.foods ?? []).map(usdaFoodToLocal);
}
