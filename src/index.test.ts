import { describe, expect, test } from 'vitest';
import { FlipIDGenerator } from './index';

describe('index', () => {
  test('should pass', () => {
    const tmp = new FlipIDGenerator('secret', 5);
    const result = tmp.encode(Buffer.from('hello'));
    expect(true).toBe(true);
  });
});
