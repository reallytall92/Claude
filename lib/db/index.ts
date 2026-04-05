import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export async function runMigrations() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      serving_size REAL NOT NULL DEFAULT 1,
      serving_unit TEXT NOT NULL DEFAULT 'serving',
      calories REAL NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL,
      sugar REAL,
      source TEXT,
      external_id TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER REFERENCES foods(id),
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      calories REAL NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(date);
    CREATE INDEX IF NOT EXISTS idx_foods_external_id ON foods(external_id);
    CREATE INDEX IF NOT EXISTS idx_foods_favorite ON foods(is_favorite);
  `);

  // Add serving_weight_grams column if missing (migration for existing DBs)
  try {
    await client.execute(`ALTER TABLE foods ADD COLUMN serving_weight_grams REAL`);
  } catch {
    // Column already exists — ignore
  }
}
