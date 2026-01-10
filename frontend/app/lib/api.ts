const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchElements(limit = 10) {
  console.log("🚀 FETCHING:", API_URL);
  try {
    const res = await fetch(`${API_URL}/elements?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed: ${res.status} ${res.statusText}`);
    return res.json();
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    return [];
  }
}
