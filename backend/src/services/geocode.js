const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const cache = new Map();

export async function geocodeLocation(query) {
  if (!query || typeof query !== "string") return null;
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "AuctionApp/1.0 (+support@example.com)",
      },
    });

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = await res.json();
    const first = Array.isArray(data) && data.length ? data[0] : null;
    if (!first || first.lat == null || first.lon == null) {
      cache.set(key, null);
      return null;
    }

    const coords = { latitude: Number(first.lat), longitude: Number(first.lon) };
    cache.set(key, coords);
    return coords;
  } catch (error) {
    console.error("Geocode failed for", query, error);
    cache.set(key, null);
    return null;
  }
}
