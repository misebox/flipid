import errors from './errors';
import { FlipIDGenerator } from './flipid.js';
import { describe, it, expect } from 'vitest';

describe('FlipIDGenerator', () => {
  describe('encode', () => {
    it('should return the expected result', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(res).toEqual('3RF1XPER0Y');
    });

    it('should return the same result as another instance with the same key', () => {
      const g1 = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const g2 = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).toEqual(res2);
    });

    it('should return the string that is difference from original', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(res).not.toEqual(Buffer.from('hello'));
    });

    it('should generate different string when different key used', () => {
      const g1 = new FlipIDGenerator({ key: 'secret1', blockSize: 7 });
      const g2 = new FlipIDGenerator({ key: 'secret2', blockSize: 7 });
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });

    it('should generate different string when different blockSize used', () => {
      const g1 = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const g2 = new FlipIDGenerator({ key: 'secret', blockSize: 6 });
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });

    it('should generate different string when different headerSize used', () => {
      const g1 = new FlipIDGenerator({
        key: 'secret',
        blockSize: 5,
        headerSize: 1,
      });
      const g2 = new FlipIDGenerator({
        key: 'secret',
        blockSize: 5,
        headerSize: 2,
      });
      const data = Buffer.from('hello');

      const res1 = g1.encode(data);
      const res2 = g2.encode(data);

      expect(res1).not.toEqual(res2);
    });
  });
  describe('decode', () => {
    it('should return the expected result', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const encrypted = '3RF1XPER0Y';

      const res = g.decodeToBuffer(encrypted);

      expect(res).toEqual(Buffer.from('hello'));
    });
  });
  describe('encode and decode reversibility', () => {
    it('decode should return the original buffer that was passed into encode', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const data = Buffer.from('hello', 'utf8');

      const encrypted = g.encode(data);
      const decrypted = g.decodeToBuffer(encrypted);

      expect(decrypted).toEqual(data);
    });
    it('decode should return the original number that was passed into encode', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const encrypted = g.encodeNumber(123456789);
      const decrypted = g.decodeToNumber(encrypted);

      expect(decrypted).toEqual(123456789);
    });
    it('should handle numbers of various digits correctly', () => {
      const g = new FlipIDGenerator({ key: 'secretkey', blockSize: 8 });
      for (let i = 1; i < 62; i++) {
        const value = 2n ** BigInt(i) - 1n;
        const encrypted = g.encodeNumber(value);
        const decrypted = g.decodeToBigInt(encrypted);

        expect(value).toEqual(decrypted);
      }
    });
    it('decode should return the original string that was passed into encode', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 10 });
      const encrypted = g.encodeString('helloworld');
      const decrypted = g.decodeToString(encrypted);

      expect(decrypted).toEqual('helloworld');
    });
    it('should throw CheckSumError if checksum is mismatch', () => {
      const g1 = new FlipIDGenerator({
        key: 'secret',
        blockSize: 5,
        checkSum: true,
      });
      const data = 'hello';
      const encoded = g1.encodeBuffer(Buffer.from(data));
      const checksumBroken = encoded.slice(0, encoded.length - 1) + '0';

      expect(() => g1.decodeToBuffer(checksumBroken)).toThrowError(
        errors.FlipIDChecksumError
      );
    });
  });
  describe('constructor arguments', () => {
    it('should use default values when no arguments passed', () => {
      const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
      const data = Buffer.from('hello');

      const res = g.encode(data);

      expect(g['headerSize']).toEqual(1);
      expect(g['checkSum']).toEqual(false);
      expect(res).not.toEqual(data);
    });
  });

  describe('edge cases', () => {
    describe('encodeBigInt', () => {
      it('should encode and decode bigint values correctly', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 16 });
        const bigValue = 2n ** 64n - 1n;
        const encoded = g.encodeBigInt(bigValue);
        const decoded = g.decodeToBigInt(encoded);
        expect(decoded).toEqual(bigValue);
      });

      it('should throw InvalidDataTypeError for non-bigint input', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 8 });
        expect(() => g.encodeBigInt(123 as unknown as bigint)).toThrowError(
          errors.FlipIDInvalidDataTypeError
        );
      });
    });

    describe('decodeToNumber overflow', () => {
      it('should throw NumberOverflowError for values exceeding MAX_SAFE_INTEGER', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 8 });
        const bigValue = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
        const encoded = g.encodeBigInt(bigValue);
        expect(() => g.decodeToNumber(encoded)).toThrowError(
          errors.FlipIDNumberOverflowError
        );
      });

      it('should not throw for values within safe integer range', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 8 });
        const safeValue = Number.MAX_SAFE_INTEGER;
        const encoded = g.encodeNumber(safeValue);
        const decoded = g.decodeToNumber(encoded);
        expect(decoded).toEqual(safeValue);
      });
    });

    describe('input validation', () => {
      it('should throw InvalidEncodedStringError for empty string', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
        expect(() => g.decodeToBuffer('')).toThrowError(
          errors.FlipIDInvalidEncodedStringError
        );
      });

      it('should throw InvalidEncodedStringError for invalid characters', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 5 });
        expect(() => g.decodeToBuffer('!!!invalid!!!')).toThrowError(
          errors.FlipIDInvalidEncodedStringError
        );
      });
    });

    describe('BlockTooLargeError', () => {
      it('should throw when buffer exceeds blockSize', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 3 });
        expect(() => g.encodeBuffer(Buffer.from('hello'))).toThrowError(
          errors.FlipIDBlockTooLargeError
        );
      });

      it('should throw when string exceeds blockSize', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 3 });
        expect(() => g.encodeString('hello')).toThrowError(
          errors.FlipIDBlockTooLargeError
        );
      });
    });

    describe('prefixSalt edge cases', () => {
      it('should work correctly with usePrefixSalt enabled', () => {
        const g = new FlipIDGenerator({
          key: 'secret',
          blockSize: 5,
          usePrefixSalt: true,
        });
        const encoded = g.encodeBuffer(Buffer.from('hello'), 'A');
        const decoded = g.decodeToBuffer(encoded);
        expect(decoded).toEqual(Buffer.from('hello'));
      });

      it('should throw InvalidArgumentError when usePrefixSalt is true but no salt provided', () => {
        const g = new FlipIDGenerator({
          key: 'secret',
          blockSize: 5,
          usePrefixSalt: true,
        });
        expect(() => g.encodeBuffer(Buffer.from('hello'))).toThrowError(
          errors.FlipIDInvalidArgumentError
        );
      });

      it('should throw InvalidArgumentError when usePrefixSalt is false but salt provided', () => {
        const g = new FlipIDGenerator({
          key: 'secret',
          blockSize: 5,
          usePrefixSalt: false,
        });
        expect(() => g.encodeBuffer(Buffer.from('hello'), 'A')).toThrowError(
          errors.FlipIDInvalidArgumentError
        );
      });
    });

    describe('blockSize=0 (variable length)', () => {
      it('should handle variable length encoding', () => {
        const g = new FlipIDGenerator({ key: 'secret', blockSize: 0 });
        const data = Buffer.from('variable length data');
        const encoded = g.encode(data);
        const decoded = g.decodeToBuffer(encoded);
        expect(decoded).toEqual(data);
      });
    });
  });
});
