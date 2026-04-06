import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 3) {
    return Response.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    input,
    key: apiKey,
    types: "address",
    components: "country:us",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );
  const data = await res.json();

  const predictions = (data.predictions ?? []).map(
    (p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    })
  );

  return Response.json({ predictions });
}
