const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchElements(limit = 10) {
  console.log("🚀 FETCHING:", API_URL);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}/elements?limit=${limit}`, {
      headers
    });
    
    if (res.status === 401) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }

    if (!res.ok) throw new Error(`Failed: ${res.status} ${res.statusText}`);
    return res.json();
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    // Don't return empty array if it's an auth error, let the redirect happen
    // but for now, we return empty to prevent crash
    return [];
  }
}