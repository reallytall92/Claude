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
  default_servings: real("default_servings"), // user's usual amount (in servings)
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

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type LogEntry = typeof log_entries.$inferSelect;
export type NewLogEntry = typeof log_entries.$inferInsert;
