import { logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class CacheService {
  private static store: Map<string, CacheEntry<any>> = new Map();
  private static readonly MAX_ENTRIES = 5000;
  private static hits = 0;
  private static misses = 0;

  /**
   * Retrieves an item from cache if present and unexpired
   */
  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Stores an item with a specified TTL in seconds and optional invalidation tags
   */
  static set<T>(key: string, value: T, ttlSeconds = 60, tags: string[] = []): void {
    // Evict oldest if capacity exceeded
    if (this.store.size >= this.MAX_ENTRIES) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  /**
   * Wraps an async function with cache: returns cached data if fresh, otherwise executes fetcher
   */
  static async wrap<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds, tags);
    return fresh;
  }

  /**
   * Invalidate a single key
   */
  static invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys associated with a specific tag
   */
  static invalidateByTag(tag: string): void {
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`[Cache] Evicted ${count} item(s) tagged '${tag}'`);
    }
  }

  /**
   * Clears the entire cache
   */
  static clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache metrics for monitoring
   */
  static getMetrics(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%';
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }
}
