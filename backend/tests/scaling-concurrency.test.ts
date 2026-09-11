import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../src/services/cacheService';
import { TaskQueueService } from '../src/services/taskQueueService';
import request from 'supertest';
import { createApp } from '../src/app';

describe('High-Concurrency & Scaling Architecture Tests', () => {
  beforeEach(() => {
    CacheService.clear();
  });

  describe('CacheService (In-Memory LRU & TTL)', () => {
    it('stores and retrieves cached data before expiration', () => {
      CacheService.set('test_key', { bloodBank: 'RedCross', availableUnits: 42 }, 60);
      const cached = CacheService.get<{ bloodBank: string; availableUnits: number }>('test_key');
      expect(cached).not.toBeNull();
      expect(cached?.bloodBank).toBe('RedCross');
      expect(cached?.availableUnits).toBe(42);
    });

    it('returns fresh data on cache miss and caches it via wrap()', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { totalDonors: 1500 };
      };

      // First call: cache miss, executes fetcher
      const result1 = await CacheService.wrap('donor_count', 30, fetcher, ['donors']);
      expect(result1.totalDonors).toBe(1500);
      expect(fetchCount).toBe(1);

      // Second call: cache hit, does not execute fetcher
      const result2 = await CacheService.wrap('donor_count', 30, fetcher, ['donors']);
      expect(result2.totalDonors).toBe(1500);
      expect(fetchCount).toBe(1); // Still 1!
    });

    it('invalidates cache items by tag', async () => {
      CacheService.set('stats_1', { count: 10 }, 60, ['stats']);
      CacheService.set('stats_2', { count: 20 }, 60, ['stats']);
      CacheService.set('other_data', { count: 99 }, 60, ['other']);

      CacheService.invalidateByTag('stats');

      expect(CacheService.get('stats_1')).toBeNull();
      expect(CacheService.get('stats_2')).toBeNull();
      expect(CacheService.get('other_data')).not.toBeNull();
    });

    it('accurately tracks metrics (hits, misses, hit rate)', () => {
      CacheService.set('key1', 'val1', 60);
      CacheService.get('key1'); // Hit 1
      CacheService.get('key1'); // Hit 2
      CacheService.get('non_existent'); // Miss 1

      const metrics = CacheService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe('66.7%');
    });
  });

  describe('TaskQueueService (Asynchronous Concurrency Queue)', () => {
    it('executes enqueued background tasks without crashing', async () => {
      let executed = false;
      const taskId = TaskQueueService.enqueue(async () => {
        executed = true;
      }, { name: 'TestTask', priority: 'NORMAL' });

      expect(taskId).toBeDefined();
      expect(taskId.startsWith('task_')).toBe(true);

      // Wait a short moment for async worker to execute
      await new Promise((r) => setTimeout(r, 50));
      expect(executed).toBe(true);
    });

    it('reports queue statistics correctly', () => {
      const stats = TaskQueueService.getStats();
      expect(stats.concurrencyLimit).toBe(8);
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.pending).toBe('number');
    });
  });

  describe('High-Throughput Rate Limiting & System Metrics', () => {
    const app = createApp();

    it('exempts health check /api/health from rate limiting', async () => {
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('healthy');
      }
    });

    it('returns system performance and cache metrics at /api/system/metrics', async () => {
      const res = await request(app).get('/api/system/metrics');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.memory).toBeDefined();
      expect(res.body.data.memory.rssMb).toBeGreaterThan(0);
      expect(res.body.data.cache).toBeDefined();
      expect(res.body.data.taskQueue).toBeDefined();
    });

    it('handles rapid consecutive requests from loopback without 429 lockout', async () => {
      const promises = Array.from({ length: 30 }).map(() =>
        request(app).get('/api/health')
      );
      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
    });
  });
});
