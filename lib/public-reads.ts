type ApiRecord = Record<string, unknown>;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  const body = (await res.json()) as ApiRecord | T;
  if (typeof body === "object" && body !== null && "error" in body) {
    throw new Error(String((body as ApiRecord).error));
  }
  return body as T;
}

export function fetchDonorsData(): Promise<ApiRecord[]> {
  return getJson<ApiRecord[]>("/api/donors");
}

export function fetchRequestsData(): Promise<ApiRecord[]> {
  return getJson<ApiRecord[]>("/api/requests");
}