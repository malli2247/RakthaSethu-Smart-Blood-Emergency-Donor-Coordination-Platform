import { logger } from '../utils/logger';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';

interface QueuedTask {
  id: string;
  name: string;
  priority: TaskPriority;
  fn: () => Promise<any>;
  retriesRemaining: number;
  enqueuedAt: number;
}

export class TaskQueueService {
  private static queue: QueuedTask[] = [];
  private static activeWorkers = 0;
  private static readonly MAX_CONCURRENCY = 8;
  private static isDraining = false;

  /**
   * Enqueues an asynchronous background job with priority handling
   */
  static enqueue(
    fn: () => Promise<any>,
    options: {
      name?: string;
      priority?: TaskPriority;
      retries?: number;
    } = {}
  ): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const task: QueuedTask = {
      id: taskId,
      name: options.name || 'AnonymousTask',
      priority: options.priority || 'NORMAL',
      fn,
      retriesRemaining: options.retries ?? 2,
      enqueuedAt: Date.now(),
    };

    // Priority sorting: CRITICAL comes first, then HIGH, then NORMAL
    if (task.priority === 'CRITICAL') {
      this.queue.unshift(task);
    } else if (task.priority === 'HIGH') {
      const firstNormalIdx = this.queue.findIndex((t) => t.priority === 'NORMAL');
      if (firstNormalIdx !== -1) {
        this.queue.splice(firstNormalIdx, 0, task);
      } else {
        this.queue.push(task);
      }
    } else {
      this.queue.push(task);
    }

    // Trigger draining process
    this.drainQueue();

    return taskId;
  }

  private static async drainQueue(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;

    while (this.queue.length > 0 && this.activeWorkers < this.MAX_CONCURRENCY) {
      const nextTask = this.queue.shift();
      if (!nextTask) break;

      this.activeWorkers++;
      this.executeTask(nextTask).finally(() => {
        this.activeWorkers--;
        this.drainQueue();
      });
    }

    this.isDraining = false;
  }

  private static async executeTask(task: QueuedTask): Promise<void> {
    try {
      await task.fn();
    } catch (err: any) {
      logger.error(`[TaskQueue] Task ${task.name} (${task.id}) failed: ${err?.message || err}`);
      if (task.retriesRemaining > 0) {
        task.retriesRemaining--;
        logger.info(`[TaskQueue] Retrying task ${task.name} (${task.retriesRemaining} retries left)`);
        this.queue.push(task);
      }
    }
  }

  /**
   * Returns queue health and pending counts
   */
  static getStats(): { pending: number; active: number; concurrencyLimit: number } {
    return {
      pending: this.queue.length,
      active: this.activeWorkers,
      concurrencyLimit: this.MAX_CONCURRENCY,
    };
  }
}
