// Lightweight in-memory client state cache to prevent full rebuilds when navigating back and forth

const clientStore = new Map<string, { data: any; timestamp: number }>();

export function getClientCache<T>(key: string, maxAgeMs = 5 * 60 * 1000): T | null {
  if (typeof window === "undefined") return null;
  const entry = clientStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    clientStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setClientCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  clientStore.set(key, { data, timestamp: Date.now() });
}

export function clearClientCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;
  if (!keyPrefix) {
    clientStore.clear();
    return;
  }
  for (const key of clientStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      clientStore.delete(key);
    }
  }
}
