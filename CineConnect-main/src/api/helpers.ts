import { USE_MOCK } from '@/services/api';

/** Simulate network latency so loading states are exercised in mock mode. */
export function mockDelay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export { USE_MOCK };
