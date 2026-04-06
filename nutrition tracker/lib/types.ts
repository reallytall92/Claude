export interface LogEntryWithFood {
  id: number;
  food_id: number | null;
  meal: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: { name: string; brand?: string | null; serving_size: number; serving_unit: string } | null;
}

export interface HistoryLogEntry {
  date: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: { name: string; brand?: string | null; serving_size: number; serving_unit: string } | null;
  servings: number;
}
