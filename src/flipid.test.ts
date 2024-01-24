import { FlipIDGenerator } from './flipid.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FlipIDGenerator', () => {
  describe('encode', () => {
    it('should return the expected result', () => {
      const g = new FlipIDGenerator('secret');
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(res).toEqual('3V3R00M3RM');
    });

    it('should return the same result as another instance with the same key', () => {
      const g1 = new FlipIDGenerator('secret');
      const g2 = new FlipIDGenerator('secret');
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).toEqual(res2);
    });

    it('should return the string that is difference from original', () => {
      const g = new FlipIDGenerator('secret');
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(res).not.toEqual(Buffer.from('hello'));
    });

    it('should generate different string when different key used', () => {
      const g1 = new FlipIDGenerator('secret1');
      const g2 = new FlipIDGenerator('secret2');
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });

    it('should generate different string when different blockSize used', () => {
      const g1 = new FlipIDGenerator('secret', 5);
      const g2 = new FlipIDGenerator('secret', 6);
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });

    it('should generate different string when different headerSize used', () => {
      const g1 = new FlipIDGenerator('secret', 5, 1);
      const g2 = new FlipIDGenerator('secret', 5, 2);
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });

    it('should generate different string when different headerSize', () => {
      const g1 = new FlipIDGenerator('secret1');
      const g2 = new FlipIDGenerator('secret2');
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });
  });
  describe('decode', () => {
    it('should return the expected result', () => {
      const g = new FlipIDGenerator('secret');
      const encrypted = '3V3R00M3RM';

      const res = g.decode(encrypted);

      expect(res).toEqual(Buffer.from('hello'));
    });
  });
  describe('encode and decode reversibility', () => {
    it('decode should return the original data that was passed into encode', () => {
      const g = new FlipIDGenerator('secret');
      const data = Buffer.from('hello');

      const encrypted = g.encode(data);
      const decrypted = g.decode(encrypted);

      expect(decrypted).toEqual(data);
    });
  });
  describe('constructor arguments', () => {
    it('should use default values when no arguments passed', () => {
      const g = new FlipIDGenerator();
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(g['key']).toEqual('');
      expect(g['blockSize']).toEqual(undefined);
      expect(g['headerSize']).toEqual(1);
      expect(res).not.toEqual(data);
    });
  });
});
