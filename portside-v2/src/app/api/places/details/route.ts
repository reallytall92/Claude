import type { NextRequest } from "next/server";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId");
  if (!placeId) {
    return Response.json({ error: "placeId required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: "address_components,formatted_address",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );
  const data = await res.json();

  const components: AddressComponent[] =
    data.result?.address_components ?? [];

  const county =
    components
      .find((c) => c.types.includes("administrative_area_level_2"))
      ?.long_name?.replace(/ County$/i, "") ?? "";

  const formattedAddress: string =
    data.result?.formatted_address ?? "";

  return Response.json({ county, formattedAddress });
}
