const requestCache = new Map<string, Promise<unknown>>();

export function deduplicateRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)! as Promise<T>;
  }

  const promise = fn().finally(() => {
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  return promise;
}
