export interface RecentAnalysis {
  url: string;
  title: string;
  timestamp: number;
  score?: number;
  summary?: string;
  // Full analysis data for loading back
  fullAnalysis?: any[];
  pageInfo?: any;
  failedProviders?: string[];
}

export interface StorageShape {
  recentAnalyses: RecentAnalysis[];
}

export const DEFAULTS: StorageShape = {
  recentAnalyses: [],
};

// Chrome storage helper
export async function getStorage<T extends keyof StorageShape>(
  key: T,
): Promise<StorageShape[T]> {
  const res = await chrome.storage.local.get(key);
  return (res[key] ?? DEFAULTS[key]) as StorageShape[T];
}

export async function setStorage<T extends keyof StorageShape>(
  key: T,
  value: StorageShape[T],
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getMulti<K extends keyof StorageShape>(
  keys: readonly K[],
): Promise<Pick<StorageShape, K>> {
  const res = await chrome.storage.local.get(keys as unknown as string[]);
  const out = {} as Pick<StorageShape, K>;
  keys.forEach((k) => {
    (out as any)[k] = (res[k] ?? DEFAULTS[k]) as StorageShape[K];
  });
  return out;
} 