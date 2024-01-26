import { describe, expect, it, test } from 'vitest';
import { exampleFlipIDGenerator, exampleSimpleCipher } from './example';

describe('example', () => {
  it('exampleFlipIDGenerator does not throw error', () => {
    exampleFlipIDGenerator();
    expect(true).toBe(true);
  });

  it('exampleSimpleCipher does not throw error', () => {
    exampleSimpleCipher();
    expect(true).toBe(true);
  });
});
