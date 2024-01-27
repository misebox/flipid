import { FlipIDGenerator } from './flipid.js';
import { describe, bench } from 'vitest';

describe('benchmark', () => {
  const g = new FlipIDGenerator('secret', 5);
  bench(
    'encodeNumber of 123456',
    () => {
      const encrypted = g.encodeNumber(123456);
    },
    { time: 100 }
  );
  bench(
    'decodeNumber of 123456',
    () => {
      const encrypted = g.encodeNumber(123456);
    },
    { time: 100 }
  );
});
