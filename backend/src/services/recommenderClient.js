const BASE_URL = process.env.RECOMMENDER_URL || "http://localhost:8090";

const defaultHeaders = {
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Recommender request failed (${res.status}): ${text}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRecommendations(userId, limit = 8) {
  try {
    const body = JSON.stringify({ user_id: String(userId), limit });
    const data = await request("/recommendations", { method: "POST", body });
    return data.items || [];
  } catch (error) {
    console.warn("[recommender] failed to fetch personalised recommendations", error.message);
    throw error;
  }
}

export async function fetchPopular(limit = 8) {
  try {
    const data = await request(`/popular?limit=${limit}`);
    return data.items || [];
  } catch (error) {
    console.warn("[recommender] failed to fetch popular items", error.message);
    throw error;
  }
}

export async function sendInteraction(userId, itemId, value) {
  try {
    await request("/interactions", {
      method: "POST",
      body: JSON.stringify({
        interactions: [
          { user_id: String(userId), item_id: String(itemId), value: Number(value) || 1 },
        ],
      }),
    });
  } catch (error) {
    console.warn("[recommender] failed to send interaction", error.message);
  }
}
