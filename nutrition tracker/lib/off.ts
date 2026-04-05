export async function searchOFF(query: string) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=id,product_name,brands,nutriments,serving_size,serving_quantity`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  const products = data.products ?? [];

  return products
    .filter((p: Record<string, unknown>) => p.product_name)
    .map((p: Record<string, unknown>) => {
      const n = (p.nutriments ?? {}) as Record<string, number>;
      const servingSize =
        typeof p.serving_quantity === "number" && p.serving_quantity > 0
          ? p.serving_quantity
          : 100;
      // OFF nutriments are per 100g by default; scale to serving
      const scale = servingSize / 100;

      return {
        name: p.product_name as string,
        brand: (p.brands as string | undefined) ?? null,
        serving_size: servingSize,
        serving_unit: "g",
        calories: Math.round((n["energy-kcal_100g"] ?? n["energy_100g"] ?? 0) * scale),
        protein: Math.round(((n["proteins_100g"] ?? 0) * scale) * 10) / 10,
        carbs: Math.round(((n["carbohydrates_100g"] ?? 0) * scale) * 10) / 10,
        fat: Math.round(((n["fat_100g"] ?? 0) * scale) * 10) / 10,
        fiber: n["fiber_100g"] != null ? Math.round(n["fiber_100g"] * scale * 10) / 10 : null,
        sugar: n["sugars_100g"] != null ? Math.round(n["sugars_100g"] * scale * 10) / 10 : null,
        source: "off" as const,
        external_id: `off_${p.id as string}`,
      };
    });
}
