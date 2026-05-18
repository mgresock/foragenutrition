import { NextRequest, NextResponse } from "next/server";

const UA = "ForageNutritionApp/1.0 (mcgresock@gmail.com)";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const zip = params.get("zip");
  const rawLat = params.get("lat");
  const rawLng = params.get("lng");

  if (zip) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&countrycodes=US&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
    ).catch(() => null);

    if (!res?.ok) return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 503 });
    const data = await res.json();
    if (!data[0]) return NextResponse.json({ error: `ZIP code ${zip} not found` }, { status: 404 });

    const addr = data[0].address;
    const city = addr?.city || addr?.town || addr?.village || addr?.suburb || zip;
    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      city,
    });
  }

  if (rawLat && rawLng) {
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);
    if (isNaN(lat) || isNaN(lng)) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) }
    ).catch(() => null);

    let city = "";
    if (res?.ok) {
      const data = await res.json();
      const addr = data.address;
      city = addr?.city || addr?.town || addr?.village || addr?.suburb || "";
    }
    return NextResponse.json({ lat, lng, city });
  }

  return NextResponse.json({ error: "Provide zip or lat/lng" }, { status: 400 });
}
