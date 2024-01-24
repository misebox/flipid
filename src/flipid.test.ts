import { FlipIDGenerator } from './flipid.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FlipIDGenerator', () => {
  describe('encode', () => {
    it('should return the expected result', () => {
      const flipIDGeneratorInstance = new FlipIDGenerator('some key', 4);
      const data = Buffer.from((123456).toString(16), 'hex');
      const result = flipIDGeneratorInstance.encode(data);
      const expectedOutput = '24W1C122';
      expect(result).toEqual(expectedOutput);
    });

    it('should return the string that is difference from original', () => {
      const flipIDGeneratorInstance = new FlipIDGenerator('some key');
      const data = Buffer.from('hello');
      const result = flipIDGeneratorInstance.encode(data);
      expect(result).not.toEqual(Buffer.from('hello'));
    });
  });
});
