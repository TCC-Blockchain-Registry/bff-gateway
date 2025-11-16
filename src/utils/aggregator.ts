/**
 * Utility functions for data aggregation
 *
 * The BFF's primary responsibility is to aggregate data from multiple sources
 * These utilities help with common aggregation patterns
 */

/**
 * Merge objects by a common key
 */
export function mergeByKey<T extends Record<string, any>>(
  array1: T[],
  array2: T[],
  key: keyof T
): T[] {
  const merged = array1.map((item1) => {
    const item2 = array2.find((i2) => i2[key] === item1[key]);
    return item2 ? { ...item1, ...item2 } : item1;
  });

  return merged;
}

/**
 * Combine DB and blockchain data for properties
 */
export interface DBProperty {
  matriculaId: string;
  ownerCpf: string;
  address: string;
  area: number;
  [key: string]: any;
}

export interface BlockchainProperty {
  matriculaId: string;
  ownerWallet: string;
  txHash?: string;
  isFrozen: boolean;
  [key: string]: any;
}

export function combinePropertyData(
  dbProps: DBProperty[],
  blockchainProps: BlockchainProperty[]
) {
  return dbProps.map((dbProp) => {
    const blockchainProp = blockchainProps.find(
      (bp) => bp.matriculaId === dbProp.matriculaId
    );

    return {
      // DB data
      matriculaId: dbProp.matriculaId,
      ownerCpf: dbProp.ownerCpf,
      address: dbProp.address,
      area: dbProp.area,

      // Blockchain data
      ownerWallet: blockchainProp?.ownerWallet || null,
      txHash: blockchainProp?.txHash || null,
      isFrozen: blockchainProp?.isFrozen || false,

      // Status based on both sources
      status: blockchainProp ? 'confirmed' : 'pending',
    };
  });
}

/**
 * Filter and sort data
 */
export function filterAndSort<T>(
  data: T[],
  filterFn: (item: T) => boolean,
  sortKey?: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  const filtered = data.filter(filterFn);

  if (sortKey) {
    filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return filtered;
}

/**
 * Paginate data
 */
export function paginate<T>(
  data: T[],
  page: number = 1,
  pageSize: number = 10
): {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
} {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: data.slice(start, end),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Cache response (simple in-memory cache)
 * In production, use Redis
 */
const cache = new Map<string, { data: any; timestamp: number }>();

export function getCached<T>(key: string, maxAge: number = 60000): T | null {
  const cached = cache.get(key);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > maxAge) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  const keysToDelete = Array.from(cache.keys()).filter((key) => key.includes(pattern));
  keysToDelete.forEach((key) => cache.delete(key));
}
