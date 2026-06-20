const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
const response = await fetch(`${API_BASE_URL}${path}`, {
method: "GET",
headers: {
"Content-Type": "application/json"
}
});

if (!response.ok) {
throw new Error(`API request failed: ${response.status}`);
}

return response.json() as Promise<TResponse>;
}
