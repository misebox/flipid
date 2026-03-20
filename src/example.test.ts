import { describe, expect, it } from 'vitest';
import { exampleFlipIDGenerator, exampleSimpleCipher } from './example';

describe('example', () => {
  it('exampleFlipIDGenerator does not throw error', () => {
    expect(() => exampleFlipIDGenerator()).not.toThrow();
  });

  it('exampleSimpleCipher does not throw error', () => {
    expect(() => exampleSimpleCipher()).not.toThrow();
  });
});
