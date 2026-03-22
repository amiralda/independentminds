import { describe, it, expect, beforeEach } from 'vitest';

interface Action {
  id: string;
  type: 'COMPLETE_BLOCK' | 'SUBMIT_CHECKIN';
  payload: object;
  retries: number;
}

const MAX = 3;
const queue: Action[] = [];

const enqueue = (
  type: Action['type'],
  payload: object
): Action => {
  const a = {
    id: `a-${Date.now()}`,
    type,
    payload,
    retries: 0,
  };
  queue.push(a);
  return a;
};

const retry = (id: string): boolean => {
  const a = queue.find((x) => x.id === id);
  if (!a) return false;
  a.retries++;
  if (a.retries >= MAX) {
    queue.splice(queue.indexOf(a), 1);
    return false;
  }
  return true;
};

describe('Offline queue', () => {
  beforeEach(() => {
    queue.length = 0;
  });
  it('queues COMPLETE_BLOCK', () => {
    enqueue('COMPLETE_BLOCK', {});
    expect(queue).toHaveLength(1);
  });
  it('queues SUBMIT_CHECKIN', () => {
    enqueue('SUBMIT_CHECKIN', {});
    expect(queue).toHaveLength(1);
  });
  it('increments retry', () => {
    const a = enqueue('COMPLETE_BLOCK', {});
    retry(a.id);
    expect(queue[0].retries).toBe(1);
  });
  it('abandons after 3 retries', () => {
    const a = enqueue('COMPLETE_BLOCK', {});
    retry(a.id);
    retry(a.id);
    retry(a.id);
    expect(queue).toHaveLength(0);
  });
});
