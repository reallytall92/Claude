import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const foods = sqliteTable("foods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand"),
  serving_size: real("serving_size").notNull().default(1),
  serving_unit: text("serving_unit").notNull().default("serving"),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber"),
  sugar: real("sugar"),
  serving_weight_grams: real("serving_weight_grams"), // gram weight per serving (for non-gram units)
  default_servings: real("default_servings"), // user's usual amount (raw value in default_unit)
  default_unit: text("default_unit"), // unit for default_servings: 'servings' | native unit | 'g'
  source: text("source"), // 'usda' | 'off' | 'custom' | 'scanned'
  external_id: text("external_id"), // USDA fdcId or OFF barcode
  is_favorite: integer("is_favorite").notNull().default(0),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const log_entries = sqliteTable("log_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  food_id: integer("food_id").references(() => foods.id),
  date: text("date").notNull(), // YYYY-MM-DD
  meal: text("meal").notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: real("servings").notNull().default(1),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  notes: text("notes"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const saved_meals = sqliteTable("saved_meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const saved_meal_items = sqliteTable("saved_meal_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saved_meal_id: integer("saved_meal_id").notNull().references(() => saved_meals.id),
  food_id: integer("food_id").notNull().references(() => foods.id),
  servings: real("servings").notNull().default(1),
  sort_order: integer("sort_order").notNull().default(0),
});

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type LogEntry = typeof log_entries.$inferSelect;
export type NewLogEntry = typeof log_entries.$inferInsert;
export type SavedMeal = typeof saved_meals.$inferSelect;
export type SavedMealItem = typeof saved_meal_items.$inferSelect;
